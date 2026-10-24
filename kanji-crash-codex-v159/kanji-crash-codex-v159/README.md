# 漢字クラッシュ — GitHub / Codex 引き継ぎ版

現在公開中の **v159** を引き継ぐソース一式です。新しいゲームへの作り替えではありません。確認日：2026-10-20（日本時間）。

- 公開サイト：https://kanji-crash-mobile.prime-otter-8314.chatgpt.site
- 対応コミット：`1e68421c502dfbc608cf76bc59af00ae11cb520c`
- 公開済み版・コミットの根拠：`PROVENANCE.json`
- 本番サイト、DB、プレイヤー情報は今回変更していません。

## 最初に読むファイル

| ファイル | 内容 |
|---|---|
| `AGENTS.md` | Codexが必ず守るデータ保護・開発・公開ルール |
| `GAME_SPEC.md` | 現行仕様、能力、数値、モード、保存形式 |
| `MIGRATION.md` | 公開環境、DB・認証・ドメインの注意、移行手順、不足事項 |
| `TEST_REPORT.md` | 今回実行したテストと未確認の項目 |
| `docs/upstream/README-v159.md` / `QA-v159.md` | 従来の開発履歴・検証記録（過去の記述を現在の確認結果と混同しないこと） |
| `docs/migration/source-files-v159.json` | 取得元534ファイルのSHA-256とサイズ |

## ローカル起動（最初の確認用）

Node.js **24以上** と npm が必要です。Pythonは通常のビルド・起動には不要です。

```bash
npm ci
npm run verify:source
npm run build
npm run dev
```

表示された `http://127.0.0.1:8787/` を開きます。終了は Ctrl+C。ポート変更は macOS/Linux なら `PORT=8788 npm run dev`、PowerShell なら `$env:PORT=8788; npm run dev`。

**この起動方法は開発専用です。** SQLiteはメモリ内で作成され、サーバー終了時に消えます。本番の復元コードや本番バックアップをこの確認用サーバーに入力しないでください。同じポートのブラウザー保存領域はサーバー終了後も残るため、検証には専用ブラウザープロファイルを使ってください。

この起動方法では独立したゲスト、ランキング、対戦等のAPIをローカルで動かせます。既存サイトのユーザー・所持文字・RPがローカルへ自動移動する機能ではありません。本番DBには接続しません。

`file://` でHTMLを直接開く方法や、GitHub Pagesだけの配置では同じ動作になりません。ルートパスのアセットと `/api/*` のWorker/DBが必要です。サブディレクトリ配信も未対応・未検証です。

## テスト

```bash
npm run test:migration
```

履歴コミットや実ブラウザーを必要としない選定テストを実行し、`docs/migration/test-results.json` に結果を出力します。`TEST_REPORT.md` が今回の実行結果です。

既存の `npm test`、多数の `test:*` も保存しています。ただし一部には古いUI文字列の固定検査、Playwright依存、`git show`で過去コミットを参照する検査があります。このZIPはGit履歴を含まないため、それらをそのまま「必須の正常系」と扱わないでください。古い検査の失敗を理由にゲームを旧仕様へ戻さないでください。

## 主な構成

- `dist/index.html`：ゲームのHTML、主要UI、インライン処理、漢字カタログ。
- `dist/*.js` / `*.css`：ルール、能力、画面、音声、保存、ネットワーク処理。
- `dist/vendor/`：同梱Matter.js・Tailwind CSS・Font Awesome・フォントとライセンス。
- `dist/audio/`：自作BGMのWAV。画像・Web App Manifest・アイコンも `dist/` に同梱。
- `server/`：Worker、ゲスト復元、オンライン対戦、ランキング、お気に入り等。
- `db/schema.ts` / `drizzle/*.sql`：Drizzleスキーマと19本のマイグレーション。
- `scripts/build-online.mjs`：静的配信物とWorkerを生成。
- `tests/`：ローカルSQLiteで動くAPIテスト、ゲームルール、UIモック等。
- `data/`：元素・魚・読み補足データ。

ビルド後の出力は `dist/client/`、`dist/server/`、`server/generated/`。二重収録を避けてZIPからは除外し、同じソースから生成します。`dist/` 自体には手書きのソースもあるため、フォルダー全体を削除してはいけません。

## 必要な設定

ローカル確認にAPIキーや秘密鍵は不要です。本番のWorkerには `ASSETS` と `DB` バインディングが必要です。`.openai/hosting.json` は元のSitesプロジェクト識別情報を保持していますが、DB実体や利用権限を持ち運べる設定ではありません。ビルドが生成するWranglerの `database_id: local-preview-only` はプレースホルダーで、そのまま公開してはいけません。

サーバー側のChatGPT認証ヘッダーは元の公開環境が付与する前提です。別のホストに移す場合の認証・DB・既存ドメインは `MIGRATION.md` に従って別途確認してください。

## GitHubへ登録してCodexに渡す

1. ZIPを展開し、このREADMEと `AGENTS.md` がリポジトリの直下になるように配置します。
2. GitHubに新しいリポジトリを作成し、このフォルダーを登録します。`node_modules`、`.env`、実DB、個人のセーブを追加しないでください。
3. Codexでそのリポジトリを選択し、最初に `AGENTS.md`、`MIGRATION.md`、`TEST_REPORT.md` を読むように指示します。
4. 初回作業は起動・選定テスト・問題点の報告までにします。公開やデータ移行は別途承認するまで行いません。

例（Gitのコマンド。GitHubの接続先URLは作成したリポジトリのURLに置換）：

```bash
git init
git add .
git commit -m "Import Kanji Crash v159"
git branch -M main
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git push -u origin main
```

この引き継ぎでGitHubリポジトリの作成・Codexへの接続・本番公開は行っていません。

## ライセンスと再生成

第三者のライセンスは `dist/vendor/licenses/`、`dist/vendor/fonts/`、`dist/unicode-license.txt` を維持してください。フォント再生成には原本TTF、fontTools、Brotliが別途必要です。WAV再生成にはPythonとNumPyが必要です。通常の起動には同梱済みWOFF2/WAVを使います。詳細は `MIGRATION.md`。
