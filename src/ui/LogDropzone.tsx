import { Copy, Dices, FileText, Upload } from "lucide-react";
import { type ChangeEvent, type DragEvent, type KeyboardEvent, useRef, useState } from "react";

import wordmarkSvg from "../assets/wordmark.svg";
import { extractLogFromZip } from "../domain/log/unzip.ts";
import { SAMPLE_CCFOLIA_LOG } from "./sampleLog.ts";
import { cn } from "./utils/cn.ts";

interface LogDropzoneProps {
  onLoad: (content: string, filename: string) => void;
}

export function LogDropzone({ onLoad }: LogDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = async (file: File) => {
    if (file.name.toLowerCase().endsWith(".zip") || file.type.includes("zip")) {
      try {
        const buffer = await file.arrayBuffer();
        const { filename, content } = await extractLogFromZip(buffer);
        onLoad(content, filename);
      } catch {}
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onLoad(reader.result, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void readFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void readFile(file);
      e.target.value = "";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <section aria-label="ログ読み込み">
      <div className="hero-stack">
        <div className="hero-copy">
          <h2 className="hero-headline">
            <img src={wordmarkSvg} alt="CoC 成長チェッカー" className="hero-wordmark" />
          </h2>
          <p className="hero-lead">
            探索者ごとに成長対象の技能を自動抽出。クリティカルなどのハウスルールにも対応。
          </p>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label="ログファイルをドラッグ＆ドロップまたはクリックして選択"
          className={cn("dropzone-card", isDragging && "drag-over")}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".html,.htm,.json,.xml,.txt,.zip"
            onChange={handleChange}
            className="hidden"
          />
          <div className="dropzone-icon" aria-hidden="true">
            <Upload className="h-6 w-6" />
          </div>
          <h3 className="dropzone-title">ログファイルをドロップ</h3>
          <p className="dropzone-sub">またはクリックしてファイルを選択</p>
          <div className="dropzone-actions">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="tm-button tm-button-primary tm-button-sm"
            >
              ファイルを選択
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoad(SAMPLE_CCFOLIA_LOG, "sample_ccfolia.html");
              }}
              className="tm-button tm-button-secondary tm-button-sm"
            >
              サンプルログで試す
            </button>
          </div>
          <p className="dropzone-note">
            対応形式: CCFOLIA (HTML/JSON/ZIP), Tekey, Udonarium (XML/ZIP), Udonarium Lycoris / Axe,
            VESPERNA 等<br />
            ファイルがインターネット上にアップロードされることはありません。
          </p>
        </div>
      </div>

      <div className="feature-3col">
        <article className="feature-3card">
          <div className="feature-3card__icon" aria-hidden="true">
            <FileText className="h-4 w-4" />
          </div>
          <h3>主要ツールのログから自動集計</h3>
          <p>
            CCFOLIA、Tekey、Udonarium、VESPERNA等のログから第6版・第7版を自動判別し、
            探索者ごとに成長候補技能を集計します。ファイルは外部へ送信されず、端末内だけで安全に処理されます。
          </p>
        </article>
        <article className="feature-3card">
          <div className="feature-3card__icon" aria-hidden="true">
            <Dices className="h-4 w-4" />
          </div>
          <h3>技能別・一括ダイスロール</h3>
          <p>
            上達チェック・成長ロール・SAN回復を技能ごと、探索者ごと、または全員一括で実行。
            技能値の手動修正や技能の追加にも対応。
          </p>
        </article>
        <article className="feature-3card">
          <div className="feature-3card__icon" aria-hidden="true">
            <Copy className="h-4 w-4" />
          </div>
          <h3>共有用テキスト出力</h3>
          <p>
            成長結果を整形テキストとしてワンクリックコピー。探索者ごとのコピーにも、全員分のまとめコピーにも対応しています。
          </p>
        </article>
      </div>
    </section>
  );
}
