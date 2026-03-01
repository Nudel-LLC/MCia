# CLAUDE.md

このファイルは Claude Code がこのリポジトリで作業する際のガイドラインです。

## プロジェクト概要

**MCia（エムシア）** は MC・コンパニオン向けのエントリー業務自動化アプリです。
Cloudflare Workers 上で動く Next.js アプリとして実装されています。

## 開発コマンド

```bash
# ローカル開発（ホットリロードあり）
npm run dev

# Cloudflare Workers でのローカルプレビュー
npm run preview

# テスト
npm run test
npm run test:watch

# Lint
npm run lint

# DB（ローカル）
npm run db:migrate

# デプロイ
npm run cf:deploy
```

## アーキテクチャ

- **フレームワーク**: Next.js 16 App Router（TypeScript）
- **ランタイム**: Cloudflare Workers（`@opennextjs/cloudflare` 経由）
- **DB**: Cloudflare D1（SQLite）+ Drizzle ORM
- **認証**: Auth.js v5（Google OAuth）+ `@auth/drizzle-adapter`
- **バリデーション**: Zod
- **テスト**: Vitest

## ディレクトリ構成

```
src/app/api/          # Next.js Route Handlers（APIエンドポイント）
src/app/(pages)/      # 各画面ページ
src/components/       # 共有Reactコンポーネント
src/db/               # DBスキーマ（schema.sql / schema.ts）
src/lib/              # ビジネスロジック（純粋な関数・クラス）
```

## 重要な設計ルール

### Cloudflare Workers 制約
- Node.js ネイティブAPI（`fs`, `path`, `crypto` 等）は使えない
- Cloudflare Workers の API を使う（例: `crypto.randomUUID()` は Web Crypto API で）
- `process.env` の代わりに Cloudflare の環境変数バインディングを使う
- `cloudflare-env.d.ts` に型定義あり

### DB アクセスパターン
- DB接続は `src/lib/db.ts` のヘルパーを使う
- Drizzle ORM を使う（生SQLは `schema.sql` の初期化のみ）
- `src/db/schema.ts` にテーブル定義あり

### 環境変数
- ローカル: `.dev.vars`（Gitにコミットしない）
- 本番: `wrangler secret put <KEY>` で設定

### APIルート
- `src/app/api/` 配下に Route Handler（`route.ts`）を配置
- 認証チェックは Auth.js の `auth()` を使う
- レスポンスは `Response.json()` または `NextResponse.json()` で返す

### テスト
- テストは `src/lib/__tests__/` と `src/db/__tests__/` に配置
- Vitest を使用（Jest 互換の API）
- Cloudflare Workers 環境のモックは各テストファイル内で設定

## 主要ファイル

| ファイル | 役割 |
|---------|------|
| `src/lib/email-classifier.ts` | Claude Haiku でメールを分類 |
| `src/lib/email-parser.ts` | メール本文から案件情報を抽出 |
| `src/lib/email-processor.ts` | エントリー・決定・辞退の処理フロー |
| `src/lib/schedule-checker.ts` | カレンダー重複判定ロジック |
| `src/lib/pr-generator.ts` | 過去実績からPR文生成 |
| `src/lib/google-api.ts` | Gmail API / Google Calendar API |
| `src/lib/auth.ts` | Auth.js 設定 |
| `src/lib/validators.ts` | Zod スキーマ定義 |
| `src/db/schema.ts` | Drizzle ORM テーブル定義 |
| `src/db/schema.sql` | SQLite DDL（`npm run db:migrate` で適用） |
| `wrangler.jsonc` | Cloudflare Workers 設定（D1, KV, Queues バインディング） |

## データモデルの概要

主要テーブル:
- `users` - ユーザー（Google OAuth情報、LINE連携、Stripe）
- `agencies` - 所属事務所（メールアドレス・ドメイン）
- `projects` - 案件（ステータス管理が中心）
- `email_classifications` - メール分類履歴
- `project_conflicts` - 案件間の日程重複
- `email_tracking` - 下書き・送信メールの追跡
- `pr_history` - PR文の実績
- `notifications` - 通知履歴

案件ステータス遷移:
```
new → draft_created → entered → confirmed
                            ↘ decline_draft → declined
```

## 仕様書

詳細な仕様・フロー・API設計は `docs/SPECIFICATION.md` を参照。
外部サービスのセットアップ手順は `docs/SETUP_GUIDE.md` を参照。
