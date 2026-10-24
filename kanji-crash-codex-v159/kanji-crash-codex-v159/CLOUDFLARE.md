# Cloudflare Workers + D1 テスト環境

この手順は当初 `kanji-crash-mobile-test` と空の
`kanji-crash-mobile-test-db` を準備したものです。Workerの希望名は現在
`kanji-crash` です。既存Sitesの公開先・本番DBは変更しません。
GitHubへのpush、リモートSQL実行、デプロイは内容を確認してから別途承認します。

## 変更内容と互換性

- `server/cloudflare.mjs` が公開エンドポイントで未検証の
  `oai-authenticated-user-id` ヘッダーを除去します。
  session・ゲスト発行・APIのすべてに同じ処理を適用します。
- 既存 `server/worker.mjs` とSites向け `npm run build` は変更していません。
- ゲストtoken/復元コードの形式、保存キー、instanceId、レベル、文、段位、
  抽選確率、能力値、ownerキー、SQLは変更していません。
- 元DBから引き継がれた `guest_links.legacy_key` はそのまま解決します。
  未認証のヘッダーから既存アカウントへのリンクを新規作成することはできません。
- 新URLのブラウザー保存領域は旧URLと別です。空のD1では旧復元コードは使えません。
  JSONバックアップだけではサーバー側のRP・フレンド・認証等を完全移行できません。

## 必要な情報

- Node.js 24以上。
- テストD1の **Database ID**（UUID、秘密情報ではありません）。
- Cloudflareへのデプロイ権限。Workers BuildsからのGitHub連携を利用する場合は
  Cloudflare側で設定します。APIトークンをコードやチャットへ貼らないでください。
- 本番の旧DB・ドメイン・認証の引き継ぎは別途確認が必要です。

以下はすべて、Gitルートではなく次のパッケージディレクトリで実行します。

```text
kanji-crash-codex-v159/kanji-crash-codex-v159
```

## ローカル準備と確認

```bash
npm ci
# 実際のテストD1のDatabase IDを設定（シェルの例）。APIトークンではありません。
export CLOUDFLARE_D1_DATABASE_ID='<テストD1のDatabase ID>'
node scripts/build-cloudflare.mjs
node tests/cloudflare-auth.mjs
npm run test:migration
npx --yes wrangler@4.152.0 deploy --dry-run --config dist/server/wrangler.cloudflare.json
npx --yes wrangler@4.152.0 d1 migrations apply DB --local --config dist/server/wrangler.cloudflare.json
npx --yes wrangler@4.152.0 dev --local --config dist/server/wrangler.cloudflare.json
```

別ターミナルで `node tests/cloudflare-smoke.mjs http://127.0.0.1:8787` を実行すると、
Workers実行環境とローカルD1を通した確認ができます。
このテストはローカル専用で、合成した新規ゲストの保存データを書き込みます。

`build-cloudflare.mjs` は既存ビルドを行い、追加の `cloudflare.js` と
`wrangler.cloudflare.json` を生成します。生成先は無視対象の `dist/server/`。
Worker名は `kanji-crash`、DB名は `kanji-crash-mobile-test-db`、
バインディング名は `DB` と `ASSETS` に固定しています。
19本の既存SQLを `migrations_dir` に指定し、ゲスト関連DDLは既存の実行時処理を維持します。
`dist/server/wrangler.json` は従来のSites用プレースホルダーを含むため、
Cloudflareのコマンドでは必ず `--config dist/server/wrangler.cloudflare.json` を指定してください。

ビルドは既存の `dist/vendor/tailwind.css`、移行テストは
`docs/migration/test-results.json` を再生成します。作業前に元の内容を退避し、
今回の結果を別の場所に残してから元の内容へ戻してください。
ユーザーによる既存変更を `git restore` 等で失わないようにしてください。
`dist/` には手書きのソースがあるため、全体を削除してはいけません。

期待する確認結果:

- `/`、JS、WAV、WOFF2が取得できる。
- 未認証で `/api/session` は `authenticated:false`。
- 偽造した `oai-authenticated-user-id` だけでは `/api/profile` は401。
- テスト用新規ゲストの保存・復元、競合時409、別ゲストとの分離が機能する。
- `/api/leaderboard?rule=cpu` / `endless` / `balanced` / `free` / `cpu-skill`
  は200と `entries` 配列を返す。
- 実機タップ操作、音声再開、動画エンコード、複数端末対戦は別途実施する。

## Workers Builds の設定案（準備完了・承認後に保存）

| 項目 | 値 |
|---|---|
| Git repository | `tenkai-t/kanji-crash-mobile` |
| Production branch | テストWorkerへ配信する変更が入ったブランチ。現時点では未push |
| Root directory | `kanji-crash-codex-v159/kanji-crash-codex-v159` |
| Build command | `npm ci && node scripts/build-cloudflare.mjs` |
| Deploy command | `npx --yes wrangler@4.152.0 deploy --config dist/server/wrangler.cloudflare.json` |
| Build variable `NODE_VERSION` | `24` |
| Build variable `CLOUDFLARE_D1_DATABASE_ID` | 実際のテストD1のDatabase ID |

Build variable は **Builds側の変数** に設定します。Workerのruntime変数だけでは
ビルド時に読み込めません。アカウントIDはWorkers Builds側の認証で扱います。
DB IDはコードに埋め込まず、ビルド時に生成設定へ渡します。
ダッシュボードで接続したDBと、このIDが同じであることを確認してください。
Worker名を実際に別名で作成した場合は、生成スクリプトの固定名も合わせる必要があります。

ビルド設定を保存すると将来のpushで自動デプロイされ得るため、
変更レビューとテストDBの準備が済むまで保存・pushは行いません。

### Worker名の変更

Workerの名前と生成設定の `name` を一致させます。今回の名前変更で
DB名・Database ID・保存キー・プレイヤーIDは変更しません。
URLの変更はブラウザー保存領域の変更を伴います。新URLで既存の復元コードを
使うには同じDBが必要です。変更前に旧URLでサーバー保存を確認し、復元コードと
手動バックアップを安全に控えてください。旧Sitesのデータ移行とは別の操作です。

## リモートDB初期化と公開（この作業では未実行）

新しい空のテストDBであること、アカウントとID、Worker名を再確認し、
承認後に管理者が次のSQL適用を行います。その後にデプロイします。

```bash
npx --yes wrangler@4.152.0 d1 migrations apply DB --remote --config dist/server/wrangler.cloudflare.json
npx --yes wrangler@4.152.0 deploy --config dist/server/wrangler.cloudflare.json
```

このSQLは旧DBの移行ではありません。既存データ入りDBへ無条件に適用しないでください。
旧DBのexport/import、既存プレイヤーの移送、旧URLの削除・転送は別計画です。
新サイトを一般公開用として案内する前に、実機確認、既存データ移行、
負荷・D1クエリ量・利用料金上限・バックアップ運用を確認してください。

## 既知の基準不一致

`npm run verify:source` は既存ライセンス2文書のLF/CRLF差分で失敗します。
比較基準は書き換えません。今回追加したファイルは元のv159比較対象に含まれません。
古い `device-rankings.mjs` / `challenge-rankings.mjs` は現行APIと不一致です。
今回の合否は選定17テスト、追加認証テスト、Workersローカル検証を分けて報告します。

## 今回の確認結果

2026-10-24、Node.js 24.19.0 / Wrangler 4.152.0:

- Cloudflareビルドと `deploy --dry-run`：成功。222アセット、DB/ASSETSバインディングを認識。
- 既存の選定テスト17件：すべて成功。
- `tests/cloudflare-auth.mjs`：偽装ヘッダー拒否、発行時の不正リンク防止、
  保存・復元・競合・別ゲスト分離、合成した旧ownerリンクの維持を確認。
- WranglerのローカルD1へのSQL19本適用：すべて成功。
- `tests/cloudflare-smoke.mjs`：ローカルWorkers + D1経由のHTTP/API確認に成功。
- ローカルD1検証には明示的なテストUUIDを使用。
  その生成設定は検証後に削除し、リモート接続やデプロイには使用していません。
- その後、ユーザーから受領したテストD1のDatabase IDでビルドと
  `deploy --dry-run` を再実施しました。これはリモートDBへの接続権限や
  DBの存在・所有者を確認する操作ではありません。
- 実機ブラウザー、リモートD1、Cloudflare上の公開動作は未確認。
- GitHubへのpush、リモートSQL、旧DBのexport/import、本番公開は未実施。
