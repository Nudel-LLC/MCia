# MCia（エムシア）

MC・コンパニオンのエントリー業務を自動化するWebアプリケーション。

複数事務所から届く案件募集メールの解析、スケジュール管理、エントリー下書き作成、辞退連絡までを自動化し、業務負担を大幅に軽減します。

## 機能概要

- **メール自動分類**: Gmail受信メールをAI（Claude Haiku）で「案件募集」「決定連絡」「その他」に分類
- **案件情報抽出**: 日程・場所・報酬などをメール本文から自動抽出
- **スケジュール重複判定**: Googleカレンダーと連携し空き確認・重複検知
- **エントリー下書き自動作成**: 過去実績からPR文も自動生成
- **カレンダー自動管理**: エントリー送信時に仮予定登録、決定時に確定更新、辞退時に削除
- **LINE通知**: 処理結果をリアルタイム通知
- **請求データエクスポート**: 月次・事務所別の確定案件をCSV出力

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 16 + TypeScript + Tailwind CSS |
| バックエンド | Cloudflare Workers + `@opennextjs/cloudflare` |
| データベース | Cloudflare D1 (SQLite) + Drizzle ORM |
| 認証 | Auth.js v5 (Google OAuth) |
| AI | Claude Haiku API（メール分類・情報抽出・PR生成） |
| 外部連携 | Gmail API、Google Calendar API、LINE Messaging API |
| 決済 | Stripe |
| テスト | Vitest |

## 開発環境のセットアップ

### 必要なもの

- Node.js 20+
- Cloudflare アカウント（Wrangler CLI）
- Google Cloud プロジェクト（Gmail API / Calendar API / Pub/Sub）
- Anthropic API キー

詳細なセットアップ手順は [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) を参照してください。

### インストール

```bash
npm install
```

### 環境変数の設定

プロジェクトルートに `.dev.vars` を作成:

```
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret
GOOGLE_CLOUD_PROJECT_ID=your_project_id
ANTHROPIC_API_KEY=sk-ant-api03-...
AUTH_SECRET=random_32_char_string
```

`AUTH_SECRET` は以下で生成:
```bash
openssl rand -base64 32
```

### ローカルDBのセットアップ

```bash
npm run db:migrate
```

### 開発サーバー起動

```bash
# Next.js 開発サーバー（ホットリロードあり）
npm run dev

# Cloudflare Workers でのローカルプレビュー
npm run preview
```

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `npm run dev` | Next.js 開発サーバー起動（localhost:3000） |
| `npm run preview` | Cloudflare Workers でのローカルプレビュー |
| `npm run build` | Next.js ビルド |
| `npm run cf:build` | Cloudflare Workers 向けビルド |
| `npm run cf:deploy` | Cloudflare Workers へデプロイ |
| `npm run db:migrate` | ローカルDBにスキーマ適用 |
| `npm run test` | テスト実行 |
| `npm run test:watch` | テストウォッチモード |
| `npm run lint` | ESLint 実行 |

## プロジェクト構成

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # APIルート
│   │   ├── agencies/       # 事務所管理API
│   │   ├── auth/           # 認証API（Auth.js）
│   │   ├── classifications/ # メール分類履歴API
│   │   ├── invoice-data/   # 請求データAPI
│   │   ├── notifications/  # 通知履歴API
│   │   ├── projects/       # 案件管理API
│   │   ├── users/          # ユーザー管理API
│   │   └── webhooks/       # Webhook受信（Gmail / LINE / Stripe）
│   ├── agencies/           # 事務所管理画面
│   ├── calendar/           # カレンダー表示画面
│   ├── dashboard/          # ダッシュボード
│   ├── invoice-data/       # 請求データ画面
│   ├── login/              # ログイン画面
│   ├── projects/           # 案件一覧・詳細画面
│   ├── settings/           # 設定画面
│   ├── setup/              # 初期設定画面
│   └── subscription/       # サブスクリプション管理画面
├── components/             # 共有コンポーネント
├── db/
│   ├── schema.sql          # SQLiteスキーマ定義
│   └── schema.ts           # Drizzle ORMスキーマ
└── lib/                    # ビジネスロジック
    ├── auth.ts             # Auth.js 設定
    ├── db.ts               # DB接続ヘルパー
    ├── email-classifier.ts # メール分類（Claude Haiku）
    ├── email-parser.ts     # メール情報抽出
    ├── email-processor.ts  # メール処理フロー
    ├── google-api.ts       # Gmail / Calendar API
    ├── pr-generator.ts     # PR文自動生成
    ├── schedule-checker.ts # スケジュール重複判定
    └── validators.ts       # Zod バリデーション
```

## 仕様書

詳細な仕様は [docs/SPECIFICATION.md](docs/SPECIFICATION.md) を参照してください。

## デプロイ

```bash
# Cloudflare Workers へデプロイ
npm run cf:deploy
```

本番環境の Secrets は Wrangler で設定:

```bash
wrangler secret put AUTH_GOOGLE_ID
wrangler secret put AUTH_GOOGLE_SECRET
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put AUTH_SECRET
```
