# TOKYO AFTER HOURS

屋上から東京の夜景を眺める、静的なピクセルアートのWebサイト。
TypeScript / Vite / PixiJS。

## 開発

Node.js 22以降で `npm ci`、`npm run dev` を実行します。
開発URLは `http://localhost:5173/silent-webpage/` です。

## 検証

- `npm run verify`: 型・Lint・単体テスト・本番ビルド。コミット前に必須です。
- `npm run test:e2e`: Playwright。GitHub Actionsで実行します。
- `npm run preview`: 生成済みの本番ビルドを確認します。

Gitフックは `npm ci` のprepareで設定されます。

## CI・公開

PRではGitHub Actionsで必須チェックとPlaywrightを実行します。
mainへのpushでは同じCIを再利用し、検証済みの `dist` をGitHub Pagesに公開します。
公開先は `https://khatada.github.io/silent-webpage/` を想定しています。
Pagesの初回有効化にはリポジトリのプラン・権限が必要です。公開workflowの結果で有効化の成否を確認します。

## ドキュメント

- [要求事項](requirements.md)
- [エージェントの作業方針](AGENTS.md)
- [実装の仮定と確認ポイント](implementation-notes.md)
- [効率的な作業の進め方](workflow-notes.md)
