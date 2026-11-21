# coc-growing-checker

CoC（クトゥルフ神話TRPG）6版・7版の各種オンラインセッションログから技能の成長判定・経験チェックを自動集計・ダイスロールするWebアプリケーション。完全クライアントサイド動作。

## 対応ツール・形式

- **オンラインセッションツール**:
  - **CCFOLIA（ココフォリア）**: 全ログHTML（旧）、JSON出力、ログ出力＋、HTML出力（ZIP / 解凍後HTML）
  - **Tekey**: Tekey形式HTML、どどんとふ形式HTML、タブ別HTML、ダークテーマ / タイムスタンプ付きHTML
  - **Udonarium（ユドナリウム）**: ルームデータZIP（`data.xml`）、単体 `data.xml`
  - **Udonarium Lycoris**: 通常ログHTML、にわとり風HTML
  - **Udonarium Axe**: 通常ログHTML、タブ別HTML、装飾スタイルHTML、互換形式HTML、テキスト形式
  - **VESPERNA**: チャットログテキスト
- **キャラクターシート管理ツール（初期技能値の読み込み）**:
  - **いあきゃら**: チャットパレット形式
  - **Charaeno（キャラエノ）**: チャットパレット形式（各種技能表記・専門分野対応）

## 機能

- **完全クライアントサイド動作**: ログはサーバーへ一切送信されず、ブラウザ内で完結。
- **6版 / 7版 両対応**: ログの出力形式から版を自動判定しつつ、画面上で手動切替も可能。
- **BCDice 完全ローカル実行**:
  - 経験チェック（1D100 > 現在値、7版の 96〜100 自動成長救済に対応）
  - 成長ロール（デフォルト 1D10、設定で 1D6 や固定値へ変更可能）
- **公式・ハウスルール対応**:
  - 対象チャンネル選択（`main` / `other` / `info` 等）
  - 成長対象とする判定結果（クリティカル、イクストリーム、ハード、スペシャル、レギュラー成功、ファンブル、失敗）
  - 除外ロール設定（正気度ロール、能力値ロール、シークレットダイス）
  - 幸運の成長設定（全員に自動追加 / ログにあれば成否不問 / 通常の成功判定）
  - 90%到達時の正気度（SAN）回復ルール（2D6、7版公式）
  - 専門分野：転換可能な技能（Transferable Skills）公式選択ルール
- **便利なUI機能**:
  - ログのドラッグ＆ドロップ読み込み（ZIPも解凍せず直接ドロップ可能）
  - キャラクターごとのタブ表示
  - 技能値のインライン編集・技能の手動追加・削除
  - 技能単独ロール・キャラ単位の一括ロール・全探索者一括ロール
  - 成長結果のクリティカル／成功サマリーを1クリックでクリップボードへコピー

## 開発コマンド

```bash
pnpm install
npx vp dev         # 開発サーバー起動
npx vp check       # format + lint + typecheck
npx vp check --fix # 自動修正
npx vp test        # 単体・結合テスト（カバレッジ計測）
pnpm run test:mutation # ミューテーションテスト
npx vp build       # 本番ビルド
pnpm run deploy    # Cloudflare Workers へデプロイ
```

## アーキテクチャ

- **エコシステム**: Vite+ (`vite-plus`)
- **フロントエンド**: React 19 + Tailwind CSS 4 + Radix UI Primitives + Lucide Icons
- **ダイスエンジン**: `bcdice`
- **ホスティング**: Cloudflare Workers（Static Assets SPA 配信、GitHub Actions で自動デプロイ、`actions.lock` 固定）
