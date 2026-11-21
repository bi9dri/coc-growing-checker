# Project Instructions for AI Assistants (coc-growing-checker)

CoC（クトゥルフ神話TRPG）6版・7版のオンラインセッションログ（CCFOLIA, Tekey, Udonarium, VESPERNA 等）から技能の成長判定・経験チェックを自動集計・ダイスロールするWebアプリケーション。完全クライアントサイド動作。

## 開発・テストコマンド

- パッケージマネージャー: `pnpm`
- 統合チェック（format + lint + type）: `npx vp check`（自動修正は `npx vp check --fix`）
- 単体・統合テスト: `npx vp test`
- VRT (Visual Regression Testing): `pnpm vrt`（スナップショット更新は `pnpm vrt:update`）
- ミューテーションテスト: `pnpm run test:mutation`
- ビルド: `npx vp build`
- デプロイ: `pnpm run deploy`（`wrangler deploy` 経由で Cloudflare Workers へ静的配信）
- 開発サーバー: `npx vp dev`

## 開発ルール

- 依存関係のバージョンはすべて固定（`^` や `~` は禁止）。更新は 7 日以上経過したバージョンのみ採用。
- パッケージマネージャーは `pnpm` を厳守（npm/yarn/bun 禁止）。
- TDD を徹底すること。ドメイン層のコード変更後は `npx vp test`（カバレッジ100%基準）および `npx vp check` が通過することを確認すること。
- Web標準のUI・CSS・アクセシビリティ実装には `modern-web-guidance` スキルを活用すること。
- テスト作成・修復には `playwright-test-*` スキルを活用すること。
- コミット前の品質ゲート: `npx vp check` と `npx vp test`、および `npx vp build` が成功すること。

## アーキテクチャ

- **エコシステム**: Vite+ (`vite-plus`)
- **フロントエンド**: React 19 + Tailwind CSS 4 + Radix UI Primitives + Lucide Icons
- **ダイスエンジン**: `bcdice`（ブラウザ内完全ローカル実行）
- **ディレクトリ構成**:
  - `src/domain/`: ログパーサ、ロール抽出、成長集計、ダイスアダプタ、設定（ピュアTS・カバレッジ100%必須）
  - `src/ui/`: React UI コンポーネント（Tailwind + Radix）
  - `test/fixtures/`: 実ログサンプルデータ（HTML / JSON）
