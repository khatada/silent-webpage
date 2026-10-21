# 実装の進行状況

最終更新: 2026-10-21。別セッションの実装再開用。

## 現在の作業（再開時はまずここを参照）

- ブランチ: `feat/image-based-nightscape`。画像生成素材へ表示を全面置換し、PR #23を作成済み。初回head e318237のCIは成功したが、構図の追加修正を行ったためマージ前に再push・再CIが必要。
- 背景3種（標準・横長・縦長）と透過スプライトをimage_gen.imagegenで制作。すべて補正後にLLMが実閲覧して素材採用。合成後11サイズも補正後LLM採用済み。最終証跡は `art-reviews/2026-10-21-generated-all-sizes/`。
- 14サイズの構図回帰テストにより星・空・乗り物・猫の可視性とサイズを検証。横長の空消失、縦長の過剰拡大、小型端末の切れを修正。旧不採用画面は `art-reviews/2026-10-21-rejected-tall/`。
- 最終変更のverify・追加コミット・push・PR #23 CI確認とマージが次の作業。その後、準備済み `/tmp/cleanup-generated-art.patch` を最新mainの別ブランチに適用して不要な旧原画描画コードを撤去する。patch未適用、ソースを再調査して使用する。
- PR #22（素材と生成出典ゲート）はCI成功後mainマージ・公開成功（4e271bc）。表示移行はまだ公開されていない。
- PR #21（手続き描画カーテン）は新指示により未マージでクローズ。旧ブランチに変更を保存。
- 継続改善の次候補はC-014（生成した猫の休憩フレーム）。ユーザーの停止指示はない。旧stashは古いdocsを含むため一括適用しない。

## 決定事項

- 要求は `requirements.md`、作業規約は `AGENTS.md` を参照する。
- TypeScript / Vite / PixiJS。CIはGitHub Actions、公開先はGitHub Pages。
- コミット前は `npm run verify` が必須。PlaywrightはCIで実行する。
- PRはレビューエージェントが確認しやすい単位で分ける。現時点はレビュー待ち不要。自律的にpush・PR作成・mainへのマージを行う。
- 実装上の仮定は `implementation-notes.md`、改善した作業方法は `workflow-notes.md` に記録する。

## タスク状況

| タスク | 状態 | 成果・残作業 |
| --- | --- | --- |
| 要求と作業方針の保存 | 完了 | PR #1 mainマージ済み |
| 開発基盤・コミット前検証 | 完了 | PR #2 mainマージ済み。TypeScript / Vite / Vitest / ESLint / Husky |
| ピクセル夜景・音・設定 | 完了 | PR #3 mainマージ済み。型・Lint・単体8件・ビルド成功。ChromiumでPC・スマートフォンのスクリーンショットと実行時エラーなしを確認 |
| CI・E2E | 完了 | PR #4 mainマージ済み。GitHub ActionsとChromium/モバイルWebKitのPlaywrightが成功 |
| GitHub Pages公開 | 完了 | mainの全チェック、Pages有効化、検証済みdistの配信が成功。https://khatada.github.io/silent-webpage/ |

初期実装は完了。ユーザー追加要求の動く夜景は下記の継続改善で対応中。実装上の見直し候補は `implementation-notes.md` を参照する。

## 継続改善の現在地

- ユーザー指示により、停止指示までアイディア提案→最優先1件の実装→再評価を継続する。
- 手順は `agents/experience-improver.md`、提案は `improvement-ideas.md` に保存する。要求事項は変更しない。
- PR #5は設定変更後の再試行でmainマージ済み（f7b5cc3）。以前の更新制限によるブロッカーは解消済み。
- 第1サイクル UX-001（設定から全画面表示）はPR #6でCI成功後mainマージ済み。
- 第2サイクル（電車・飛行機・野良猫・窓の点消灯とOS動き軽減の同期）はPR #7でCI成功後mainマージ済み（76d2c9a）。公開も成功。
- 第3サイクル C-001（カップの湯気と鉢植えの夜風）はPR #8でCI成功後mainマージ済み（74c3bb9）。公開も成功。
- 第4サイクル C-002（猫のくつろぐ仕草と足元の影）はPR #9でCI成功後mainマージ済み（b71f3ba）。公開も成功。
- 第5サイクル C-006（窓の奥の人影）はPR #10でCI成功後mainマージ済み（956d352）。公開も成功。
- 第6サイクル C-004（月と薄雲）はPR #11でCI成功後mainマージ済み（b68f12c）。公開も成功。
- 第7サイクル C-003（路地を通る遠いタクシー）はPR #12でCI成功後mainマージ済み（9b58dc7）。公開も成功。
- 第8サイクル C-008（路地の自販機の灯り）はPR #13でCI成功後mainマージ済み（c4c2be5）。公開も成功。
- 第9サイクル C-005（隣の屋上の物干し）はPR #14でCI成功後mainマージ済み（ed8ff74）。
- 第10サイクル C-009（室外機のファン）はPR #17でmainマージ済み。補正後9画像をLLM確認し採用。初回CIの描画競合を1並列化で解消し、再CI成功。
- 次候補はC-010（電車の車内）、C-011（カーテン）、C-012（飛行機の細部）。コンテンツ中心の改善を継続する。
- 要求事項はユーザーの明示指定のみを保持し、コンテンツ案は `improvement-ideas.md` に分ける。

## 再開手順

1. `git status --short --branch`、`git log`、GitHub上のPR状態で、この記録以降の変更を確認する。
2. `npm ci` 後、`npm run verify` を実行する。
3. 上記の未完了タスクを小さなPR単位で進める。作業中の変更を上書きしない。
4. コミット前の必須チェック、PRのCI結果、マージ結果、公開結果を本ファイルに追記する。

## この時点の環境・検証

- 初期夜景体験の検証は単体8件。現在の改善を含む最新の件数は「継続改善の現在地」を参照する。
- ローカルHTTP待ち受けとGitのネットワーク操作には環境のsandbox外実行が必要。
- `gh api` はForbidden。Git fetch/pushとGitHubコネクタのPR作成・マージは利用できる。
- 初期実装・CIファイルはmainへマージ済み。改善中のブランチと未コミット変更は「継続改善の現在地」とGitで照合する。一時ファイルに依存せず再開できる。
- 画面は合成の音を使用するため、音質や心地よさは実装後の見直し事項。

## PR

- [#1 要件と方針](https://github.com/khatada/silent-webpage/pull/1): マージ済み。
- [#2 開発基盤](https://github.com/khatada/silent-webpage/pull/2): マージ済み。
- [#3 夜景と音の体験](https://github.com/khatada/silent-webpage/pull/3): マージ済み。
- [#4 CIと公開](https://github.com/khatada/silent-webpage/pull/4): CI成功後にマージ済み。
- [#13 路地の自販機](https://github.com/khatada/silent-webpage/pull/13): CI成功後mainマージ済み。
- [#12 路地のタクシー](https://github.com/khatada/silent-webpage/pull/12): CI成功後mainマージ済み。
- [#11 月をかすめる薄雲](https://github.com/khatada/silent-webpage/pull/11): CI成功後mainマージ済み。
- [#10 窓の奥の生活感](https://github.com/khatada/silent-webpage/pull/10): CI成功後mainマージ済み。
- [#9 猫のくつろぐ仕草](https://github.com/khatada/silent-webpage/pull/9): CI成功後mainマージ済み。
- [#8 カップの湯気と葉の揺れ](https://github.com/khatada/silent-webpage/pull/8): CI成功後mainマージ済み。
- [#7 動く夜景](https://github.com/khatada/silent-webpage/pull/7): CI成功後mainマージ済み。
- [#6 全画面表示・改善エージェント定義](https://github.com/khatada/silent-webpage/pull/6): CI成功後mainマージ済み。
- [#5 完了記録と引き継ぎ](https://github.com/khatada/silent-webpage/pull/5): CI成功後、設定変更後の再試行でマージ済み。

## 検証の証跡

- [PR #4 CI成功](https://github.com/khatada/silent-webpage/actions/runs/39439319952): 型・Lint・単体8件・ビルド・Playwright。
- [初回main公開処理](https://github.com/khatada/silent-webpage/actions/runs/39439630135): 全検証、Pages有効化、デプロイが成功。
- [PR #5初回CI](https://github.com/khatada/silent-webpage/actions/runs/39440161448): 全チェック成功。ブロッカー追記による後続pushのCIは別実行となる。
- 公開URLは上記デプロイの成功に基づく。外部Web参照ツールではURLを取得できず、公開後の実ブラウザ操作は未確認。体験自体は本番ビルドのローカル表示およびCIで検証済み。

- [PR #7 CI成功](https://github.com/khatada/silent-webpage/actions/runs/39516912663): 型・Lint・単体11件・ビルド・Chromium/モバイルWebKit。

- [PR #8 CI成功](https://github.com/khatada/silent-webpage/actions/runs/39517464293): 全チェック成功。
- [PR #7反映後の公開成功](https://github.com/khatada/silent-webpage/actions/runs/39517187285)。

- [PR #8反映後の公開成功](https://github.com/khatada/silent-webpage/actions/runs/39517688545)。

- [PR #9 CI成功](https://github.com/khatada/silent-webpage/actions/runs/39518129075): 型・Lint・単体13件・ビルド・ブラウザ検証。

- [PR #9反映後の公開成功](https://github.com/khatada/silent-webpage/actions/runs/39518376172)。

- [PR #10 CI成功](https://github.com/khatada/silent-webpage/actions/runs/39519022557): 全チェック成功。

- [PR #10反映後の公開成功](https://github.com/khatada/silent-webpage/actions/runs/39519300380)。

- [PR #11 CI成功](https://github.com/khatada/silent-webpage/actions/runs/39519846050): 全チェック成功。

- [PR #11反映後の公開成功](https://github.com/khatada/silent-webpage/actions/runs/39520070280)。

- [PR #12 CI成功](https://github.com/khatada/silent-webpage/actions/runs/39520843127): 型・Lint・単体22件・ビルド・ブラウザ検証。

- [PR #12反映後の公開成功](https://github.com/khatada/silent-webpage/actions/runs/39521050817)。

- [PR #13 CI成功](https://github.com/khatada/silent-webpage/actions/runs/39521548309): 全チェック成功。

- [PR #13反映後の公開成功](https://github.com/khatada/silent-webpage/actions/runs/39521753347)。

## 最新ユーザー要求: 精細化と補正

- 第10サイクルC-009の未完了変更は `feat/rooftop-fan` のstash `WIP C-009 rooftop fan before pixel alignment request` に保存。最新要求を優先する。stashは自動適用せず差分を確認する。
- `feat/pixel-art-correction` で補正プログラムと手順を実装。PNG/RGBAの格子補正、透明度、整数拡大、SHA256レポート、単体5件。まずツールをPR化し、続くPRで表示格子と細部を改善する。
- requirements.mdにユーザーの明示変更のみを反映。補正後画像のLLM確認を以後必須とした。

- 補正ツールはPR #15でCI成功後mainマージ済み（c981d67）。CI: https://github.com/khatada/silent-webpage/actions/runs/39568745673 。
- 精細化は `feat/finer-nightscape` 。表示格子・細部・影を修正し、PC/高DPIモバイル/狭幅の補正後画像をLLMが閲覧して採用。`art-reviews/manifest.json` に保存。コミット・CI・マージ・公開はこれから。

- 精細化の最終証跡: `art-reviews/2026-10-21-fine-grid-final/` 。補正前後RGBAは3サイズ全て一致（表示側で既に整列済み）、補正後PNGをLLMが再閲覧し採用。DPRだけの変更にも追従。PR #15反映後の公開成功: https://github.com/khatada/silent-webpage/actions/runs/39569056462 。

- 精細化の必須チェックは型・Lint・単体33件・補正/採用記録・本番ビルド。表示格子のリサイズ検証はCIで実行。古いソース証跡・未採用記録の拒否を確認済み。

- 精細化PR #16は型・Lint・単体33件・画像採用記録・ビルド・CIのブラウザ検証成功後mainマージ済み（81e2a65）。CI: https://github.com/khatada/silent-webpage/actions/runs/39570106186 。公開処理の結果を確認する。

- PR #16反映後の公開成功: https://github.com/khatada/silent-webpage/actions/runs/39570451927 。
- C-009は実装済み。3画面の全景と回転6姿勢を補正後にLLMが閲覧して採用。証跡は `art-reviews/2026-10-21-rooftop-fan/` 。コミット・PR・CI・マージはこれから。

- PR #17初回CI: https://github.com/khatada/silent-webpage/actions/runs/39571536793 。WebKitは成功、Chromiumは複数操作が遅く再開画像比較5秒待ちが失敗。ローカル2並列は再開画像取得2〜3秒・全体12〜15秒、1並列は約1秒・全体5秒で停止画像一致と再開差分を確認。CI workersを1へ変更し、テスト内容・タイムアウトは維持する。

- PR #17修正後CI成功: https://github.com/khatada/silent-webpage/actions/runs/39572724254 。型・Lint・単体33件・9画像の補正/採用記録・ビルド・ブラウザ検証。

- C-010は実装済み。PC・高DPIモバイル・狭幅の全景と電車の拡大の4画像を補正後にLLMが閲覧し採用。証跡 `art-reviews/2026-10-21-train-interior/` 。コミット前チェックへ進む。

- PR #17反映後の公開成功: https://github.com/khatada/silent-webpage/actions/runs/39573155313 。
- C-010の型・Lint・単体33件・4画像の補正/採用記録・本番ビルド成功。PR化とCI確認へ進む。

- PR #18 CI成功: https://github.com/khatada/silent-webpage/actions/runs/39574103277 。型・Lint・単体33件・4画像の補正/採用記録・ビルド・ブラウザ検証。

- C-012は実装済み。PC・高DPIモバイル・狭幅の全景と飛行機の拡大の4画像を補正後にLLMが閲覧し採用。証跡 `art-reviews/2026-10-21-distant-aircraft/` 。コミット前チェックへ進む。

- PR #18反映後の公開成功: https://github.com/khatada/silent-webpage/actions/runs/39574606533 。

- PR #19 CI成功: https://github.com/khatada/silent-webpage/actions/runs/39575556043 。型・Lint・単体33件・4画像の補正/採用記録・ビルド・ブラウザ検証。

- PR #19反映後の公開成功: https://github.com/khatada/silent-webpage/actions/runs/39575918600 。
- C-013: 3画面全景の補正とLLM閲覧済み。長い仮想時間を進めた全景の姿勢撮影は画像取得30秒タイムアウト。静止姿勢のアトラスへ切り替え、同じ猫の描画関数へ25.5/27/29秒の姿勢を直接渡す補助ツールを実装中。呼吸のタイミングは単体で検証済み。まだ採用記録更新・全verify・コミットはしていない。

- C-013の全景3画像と静止アトラスを補正後にLLMが閲覧し採用。アトラスは通常/吸気/戻りを実APIで1回描画し、吸気差分は背中の上端2行68画素、戻りは通常と完全一致。`art-reviews/2026-10-21-cat-breath/` とmanifestへ記録。全verifyとコミット/PRはこれから。

- C-013の型・Lint・単体34件・4画像の補正/採用記録・本番ビルド成功。

- [PR #22](https://github.com/khatada/silent-webpage/pull/22): 画像生成素材・制作規約・生成出典ゲート。CI成功 https://github.com/khatada/silent-webpage/actions/runs/39608095949 、mainマージ4e271bc。
