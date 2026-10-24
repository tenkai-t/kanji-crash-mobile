# TEST_REPORT — 移行用パッケージの確認結果

実施日：2026-10-20。対象は公開版v159の独立コピー。本番DB・本番APIへの書込みは行っていません。

## 版とソースの確認

- Sitesの最新保存版v159、公開処理succeeded、対応ソースコミット `1e68421c502dfbc608cf76bc59af00ae11cb520c` を照合。
- Gitコミットから534ファイルを取得（追跡されていたnode_modulesを除外）。529個の変更対象外ファイルをSHA-256で照合し一致。
- 移行用README、package設定、.gitignore等の変更は別に記録し、元の文書とpackage/lockをdocs/upstreamへ保存。ゲームのHTML/CSS/JS・サーバー・画像・WAV・WOFF2は元のまま。
- 公開URLの独立HTTP取得は実行環境から403。公開ページのバイト列を直接比較できたとは記載しない。

## 依存関係・ビルド・起動

- `npm ci --offline`：失敗。環境のnpmキャッシュにyaml-2.9.1.tgzがなかったため。
- 続けて `npm ci`：成功（lockfileに基づき90パッケージを導入）。
- `npm run build`：成功。Tailwind CSSとWorker bundle、生成カタログ/読みデータを生成。
- `npm run verify:source`：成功。529ファイルが公開v159の取得元ハッシュと一致（文書/起動設定等の例外はスクリプトに明記）。
- `tests/migration-startup.mjs`：新しいローカル起動コマンドを子プロセスで開始し、終了まで確認。HTML・JS・WAV・WOFF2のHTTP 200、匿名session、独立SQLiteでのguest作成を確認。本番のID/復元コードは使用していない。
- HTML/CSSの静的参照192パスを検査し欠落0、外部参照0。動的読込の全操作・音声再生を検証したという意味ではない。

## 選定テスト

`npm run test:migration`：17件すべて成功。各テストは原則ローカル・メモリDB・合成状態・モックを使う。ブラウザー操作や実データの完全性を証明するものではない。

| テスト | 結果 | 所要秒 |
|---|---|---:|
| `tests/migration-startup.mjs` | PASS | 0.34 |
| `tests/save-protection-v73.cjs` | PASS | 0.08 |
| `tests/save-reliability-v136.cjs` | PASS | 0.07 |
| `tests/inventory.cjs` | PASS | 0.13 |
| `tests/balance.cjs` | PASS | 0.22 |
| `tests/abilities.cjs` | PASS | 0.37 |
| `tests/character-fragments-v91.cjs` | PASS | 0.11 |
| `tests/gifts-v159.cjs` | PASS | 0.08 |
| `tests/gacha-repeat-v138.cjs` | PASS | 0.08 |
| `tests/replay-audio-v156.cjs` | PASS | 0.07 |
| `tests/replay-audio-engine-v156.cjs` | PASS | 0.07 |
| `tests/replay-audio-ui-v158.cjs` | PASS | 0.07 |
| `tests/guest-players-v140.mjs` | PASS | 0.28 |
| `tests/friends.mjs` | PASS | 0.45 |
| `tests/online.mjs` | PASS | 0.52 |
| `tests/replays-api.mjs` | PASS | 0.42 |
| `tests/replay-favorites-api.mjs` | PASS | 0.40 |

保存保護/競合、錬成と育成、基礎バランス、能力、かけら/ギフト、召喚の再実行防止、音付き動画のモック経路、ゲスト復元、フレンド、オンラインマッチング/対局/RP、リプレイAPIとお気に入りを含む。API検査はCloudflare D1を模したローカルSQLiteに対して実行した。

機械可読の結果は `docs/migration/test-results.json`。DBのDDLはローカルSQLiteへ19本のマイグレーションとゲスト用実行時DDLを適用し、25テーブルの定義を `docs/reference/schema-tables-v159.json` に抽出。これは本番DBから取得した実スキーマ/実レコードの確認ではない。

## 未確認・実施していないこと

- 実ブラウザーでの初期表示、タップ/ドラッグ、iPhone/Android、ホーム画面起動、音の聞こえ方、Web Audioの実機復旧。
- 召喚/錬成の視覚演出、レアカード裏面、初発見演出、スキップの実画面での押しやすさ。
- ネイティブMediaRecorderのMP4/WebM生成、端末写真/ファイルへの動画保存。音/映像の自動テストはモックを含む。
- 本番ユーザーの所持文字・RP・ランキング等の件数/個別整合性。本番データを取得・移動していない。
- 別の実ホストでの公開、認証ゲートウェイ、D1接続、ドメイン切替と同一復元コードでの復元。
- 全既存テストの一括実行。履歴コミット参照、旧UI固定文字列、Playwright依存の検査は今回の選定対象外。Git履歴がないZIPで通らない検査を、動作不良の証拠と即断しない。

管理された実行環境では対応するブラウザー制御機能が利用できず、ブラウザーによる画面検証・スクリーンショットは行っていない。HTTP/APIテストと実ブラウザー検証を区別する。

## 配布前の検査

APIキー・秘密鍵・署名URL・認証tokenの固定実値等をパターン検査し、実データ/環境ファイル・Git設定・node_modules・生成物重複を除外してZIP化。元のライセンスとfont/BGMデータを保持。ZIP内容のCRC検査と再展開後のパス/必須ファイル確認を行う。個人のlocalStorage・本番DB・本番tokenは含まない。
