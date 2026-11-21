export interface ExtractedFile {
  name: string;
  text: string;
}

export async function unzipFiles(buffer: ArrayBuffer): Promise<ExtractedFile[]> {
  const view = new DataView(buffer);

  let eocdOffset = buffer.byteLength - 22;
  while (eocdOffset >= 0) {
    if (view.getUint32(eocdOffset, true) === 0x06054b50) break;
    eocdOffset--;
  }
  if (eocdOffset < 0) {
    throw new Error("有効なZIPファイルではありません");
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  let offset = cdOffset;
  const files: ExtractedFile[] = [];

  for (let i = 0; i < totalEntries; i++) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x02014b50) break;

    const method = view.getUint16(offset + 10, true);
    const compSize = view.getUint32(offset + 20, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);

    const nameBytes = new Uint8Array(buffer, offset + 46, nameLen);
    const name = new TextDecoder("utf-8").decode(nameBytes);

    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen;

    const compressed = new Uint8Array(buffer, dataOffset, compSize);
    let decompressed: Uint8Array;

    if (method === 0) {
      decompressed = compressed;
    } else if (method === 8) {
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      void writer.write(compressed);
      void writer.close();

      const chunks: Uint8Array[] = [];
      const reader = ds.readable.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      decompressed = new Uint8Array(totalLen);
      let pos = 0;
      for (const c of chunks) {
        decompressed.set(c, pos);
        pos += c.length;
      }
    } else {
      throw new Error(`サポートされていないZIP圧縮形式です: ${method}`);
    }

    files.push({ name, text: new TextDecoder("utf-8").decode(decompressed) });
    offset += 46 + nameLen + extraLen + commentLen;
  }

  return files;
}

const LOG_EXTENSIONS = [".html", ".htm", ".xml", ".txt", ".json"];

export async function extractLogFromZip(
  buffer: ArrayBuffer,
): Promise<{ filename: string; content: string }> {
  const files = await unzipFiles(buffer);
  const logFiles = files.filter((f) => {
    const lower = f.name.toLowerCase();
    return LOG_EXTENSIONS.some((ext) => lower.endsWith(ext));
  });

  if (logFiles.length === 0) {
    throw new Error("ZIP内に対応するログファイルが見つかりません");
  }

  const allTabFile = logFiles.find((f) => {
    const lower = f.name.toLowerCase();
    return lower.includes("すべて") || lower.includes("all");
  });
  if (allTabFile) {
    return { filename: allTabFile.name, content: allTabFile.text };
  }

  const dataXml = logFiles.find((f) => f.name.toLowerCase().endsWith("data.xml"));
  if (dataXml) {
    return { filename: dataXml.name, content: dataXml.text };
  }

  const mainFile = logFiles.find(
    (f) => f.name.includes("メイン") || f.name.toLowerCase().includes("main"),
  );
  const chosen = mainFile ?? (logFiles[0] as ExtractedFile);

  return { filename: chosen.name, content: chosen.text };
}
