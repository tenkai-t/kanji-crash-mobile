# MIGRATION — 公開版v159の引き継ぎ

確認日：2026-10-20（日本時間）。この成果物は**コードと仕様の引き継ぎ**です。本番公開、既存サイト変更/削除、データ移行、GitHubへの登録は実施していません。

## 1. 取得した版の根拠

| 項目 | 確認値 |
|---|---|
| 公開URL | https://kanji-crash-mobile.prime-otter-8314.chatgpt.site |
| 最新保存版 | v159 |
| その版の公開状態 | succeeded |
| ソースコミット | `1e68421c502dfbc608cf76bc59af00ae11cb520c` |
| Sites project_id | `appgprj_6ac2fbfa1e7481918719b3a9c592f01a` |
| 保存版ID | `appgprj_6ac2fbfa1e7481918719b3a9c592f01a~appgver_c222a96296148191b3b1d41fecec2c15` |
| 公開処理ID | `appgdep_6ad3b9ff0f448191a94e8fe6ffaad7c5` |

Sitesの保存版と公開状態を照合し、対応するGitコミットから直接534ファイルを取得しました。追跡されていたnode_modulesは配布から除き、package-lock.jsonで再現します。元ファイル一覧・SHA-256は `docs/migration/source-files-v159.json`。ゲーム本体のHTML/CSS/JS・画像・音声・フォント・サーバー処理は元バイト列を維持しています。

実行環境から公開URLを直接HTTP取得する試みは403だったため、公開HTMLの独立したハッシュ比較はできていません。公開版とコミットの対応はSitesの保存版/公開状態により確認しています。実ブラウザーでの公開サイト確認は未実施です。

## 2. 公開環境と実行構成

- フロントエンド：HTML/JavaScript/CSS、Canvas、Matter.js、ルートパスの静的アセット。
- サーバー：Cloudflare Workers向け `server/worker.mjs`。`/api/*` を処理し、それ以外を `ASSETS.fetch` に渡す。
- 永続DB：Workerの `DB` バインディングを通したD1/SQLite形式。`.openai/hosting.json` は `d1: DB` / `r2: null`。R2利用はこの設定にない。
- 認証：ゲスト資格情報と復元コード。元ホストの `oai-authenticated-user-id` と端末IDを使う従来経路も残る。
- オンライン：HTTP API、ルームrevision、サーバー側の物理計算/対戦進行、ポーリング、対人RP、ランキング、フレンド、リプレイ保存等。単純な静的配信だけでは再現できない。
- ビルド：Tailwind CSS＋esbuild。配信物は `dist/client/` と `dist/server/index.js`。現状のビルドはSitesの `.openai/hosting.json` を参照する。
- `dist/server/wrangler.json` は生成物。DB IDの `local-preview-only` は本番DB IDではない。

## 3. 保存場所と互換性

| データ | 現在の保存先・識別 | 移行時の扱い |
|---|---|---|
| 所持文字、instanceId、Lv、経験値、ルビ、文、段位、編成、発見、実績等 | 主に端末localStorageの `moji_otoshi_save_v5` 内のgameState | キーと構造を維持。初期状態で上書きしない |
| 保護用バックアップ | `_previous` / `_rejected` / `_history` 接尾辞 | 一式を維持。履歴は最大10件の既存仕様 |
| 手動バックアップ | JSON `{format: "kanji-crash-save", version: 1, savedAt, state}` | 既存importの検証・正規化・保護を維持 |
| 端末ID | `kanji_player_device_v1`（32桁hex） | 自動再発行しない。旧ログイン識別に関係 |
| ゲスト資格情報 | `kanji_guest_credentials_v1`（guestId/token/recoveryCode/revision等） | 秘密情報。ZIPには実値を含めない |
| サーバーのゲスト状態 | guest_players.snapshot / revision、guest_backups | 実DBを維持/別承認で移送しないと復元不可 |
| 復元認証 | guest_players.recovery_hash、guest_sessions.token_hash、guest_links | ハッシュから元コードを復元できない。新しいコードへの置換で済ませない |
| 対人RP・戦績・ランキング | online_stats、online_results、challenge_scores、cpu_scores等 | 同じownerキー・ルール別識別と実DB行が必要 |
| プロフィール・枠・勲章等 | ローカル進捗＋player_profiles等 | ローカルだけ/サーバーだけで全情報が揃うと決めつけない |
| フレンド・対局ルーム | friend_players / friend_connections / friend_rooms等 | 関連する行とID・参照関係を維持 |
| リプレイ・お気に入り・編成お気に入り | ローカル履歴＋battle_replays / deck_favorites等 | ownerスコープと容量制限を維持。表の正確な名前はスキーマ参照 |
| 音量等 | `kanji_crash_sound_preferences_v1` / `kanji_crash_bgm_preferences_v1` | 各ON/OFF・音量を維持 |
| ギフト受取 | gameState.giftClaims＋`kanji_gift_`接頭辞の端末マーカー | コードIDを付け替えず、再付与しない |

詳細なキー文字列の出現箇所は `docs/reference/storage-key-literals-v159.json`。これはソース中の文字列一覧で、動的キーの完全な実データ一覧ではありません。実DBの正確な定義はマイグレーションと `server/guest-players.mjs` の実行時DDL、`docs/reference/schema-tables-v159.json` を参照してください。

**URLのオリジンが変わるとlocalStorageは共有されません。** コードをGitHubへ移しただけでは端末データは移りません。同じドメインで更新できれば端末の保存領域を継続利用できる可能性がありますが、元ホストのドメイン持ち出し可否は未確認です。

**復元コードは元サーバーのDBに紐づきます。** 新しい空DBに同じコードを入力しても、既存所持データやRPを復元できません。手動JSONバックアップだけで全サーバーデータ・認証を移行できるわけではありません。

## 4. 同梱したもの・していないもの

同梱：全534ソースファイル（node_modulesを除く）、固定依存関係、19本のSQL、サーバー実装、読み/画数/カタログ/レシピ/能力/ルール、画像、アイコン、Manifest、WAV、分割WOFF2、ライセンス、既存テスト、起動補助、仕様書。

取得していない/未確認：

1. **本番DBの実データ・スナップショット**：今回は取得していない。人数、実レコード数、実際の全バックアップ状態も未確認。
2. **本番D1のdatabase_id、Cloudflare account_id、接続権限、管理用認証情報**：取得していない。名称やIDを推測して設定していない。
3. **各利用端末のlocalStorage、ゲストtoken、復元コード、個人バックアップ**：取得していない。削除/初期化もしていない。
4. **元ホストの認証ヘッダー付与・ゲートウェイ・ドメイン設定の管理権限**：アプリコードだけでは移せない。別環境で設計/検証が必要。
5. **IPAmj明朝原本TTF・BabelStone Han原本TTF**：再生成スクリプトが要求する原本はZIPにない。同梱WOFF2で実行できる。原本ハッシュ/ライセンスは既存スクリプト・フォントREADME参照。
6. **npm依存の配布元、読み辞書更新元のネットワーク可用性**：環境依存。既存readings.jsは同梱。辞書更新やフォント再生成を通常起動時に実行しない。
7. **Gitの全過去履歴**：ZIPに含まない。過去コミット参照の一部テストはそのまま使えない。
8. **実機・実ブラウザー、公開サイトへの匿名HTTPアクセス条件、実動画エンコード**：今回未確認。詳細はTEST_REPORT.md。

秘密鍵・APIキー・ログインCookie等は同梱しません。固定のギフトコードは既存ゲームの公開クライアント仕様の一部として保持します。

## 5. 引き継ぎ用に加えた変更

本番ソース自体は変更せず、独立したコピーにのみ以下を追加しました。

- README.md / AGENTS.md / GAME_SPEC.md / MIGRATION.md / TEST_REPORT.md / PROVENANCE.json。
- Node 24の指定、ローカル起動と移行用テスト用npm scripts、.gitignore。
- `scripts/dev-local.mjs`：127.0.0.1専用・メモリDB・信頼認証ヘッダーを除去する既存テストfixtureを利用。
- `scripts/test-migration.mjs` / `scripts/verify-source.mjs` / `scripts/migration-reference.mjs` / `tests/migration-startup.mjs`。
- 元README/QA/package/lockを `docs/upstream/` へ保存。仕様抽出JSON・ハッシュ・検証結果も同梱。

ゲームのHTML/CSS/JS・画像・音声・フォント・サーバー・SQLの実装は変更しません。

## 6. 将来の移行手順（今回は実行しない）

1. GitHub/Codexへ本ZIPを取り込み、独立DBでbuildと選定テストを通す。
2. まず元サイトを維持したまま、Codexでソース編集できるようにする。ソース管理の移行と、ホスト/実DBの移行を分けて扱う。
3. ホスト変更が必要なら、ユーザーの明示的な承認を得てから、本番DBの管理者による一貫したexport、暗号化保管、件数/参照関係/復旧手順を計画する。本ZIPから実データが復元できると判断しない。
4. 認証経路を確定する。外部から送られた `oai-authenticated-user-id` をそのまま信頼しない。ゲスト方式と従来キーを維持できるか確認する。今回この認証仕様を勝手に書き換えない。
5. 新しい本番用DBに元DBを再現し、guest/session/link/owner/ランキング/リプレイ等を照合する。空DBからの自動初期化で代用しない。移行SQLの本番実行は別途承認が必要。
6. 専用の検証用コピーで、元の復元コード、サーバーsnapshot、手動JSON、RP/枠/勲章/お気に入り等の整合性を確認する。個人データをGitHubへ入れない。
7. オリジン変更時の端末データ引き継ぎと、更新が競合する期間の扱い、切戻しを計画する。
8. サーバーと静的アセットを同じルートオリジンで提供できるか確認する。HTTPS、API、フォント/WAV MIME、認証、CORS、キャッシュを実機で検証する。
9. 検証結果と切替対象をユーザーに提示し、承認後にだけ公開/切替する。旧サイトは切戻し・保全方針が確定するまで削除しない。

GitHub Pagesへ静的ファイルだけ置く方法では、既存のオンライン・ランキング・復元は引き継げません。現時点では既存Sitesを維持しつつ、Codexで編集/検証する手順が最も変更範囲を小さくできます。
