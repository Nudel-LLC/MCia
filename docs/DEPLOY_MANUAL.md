# MCia デプロイ作業マニュアル

このドキュメントは、MCiaを本番環境にデプロイするために必要な **外部サービスの設定作業** をまとめたものです。
上から順番に実行してください。

---

## 作業一覧

| # | 作業 | 所要時間 | 場所 |
|---|------|----------|------|
| 1 | D1 データベースにスキーマを適用 | 3分 | Cloudflare ダッシュボード |
| 2 | Stripe で商品・価格を作成 | 5分 | Stripe ダッシュボード |
| 3 | Stripe Webhook を設定 | 3分 | Stripe ダッシュボード |
| 4 | LINE Messaging API チャネルを作成 | 10分 | LINE Developers |
| 5 | Cloudflare Workers に環境変数を設定 | 5分 | ターミナル |
| 6 | Google OAuth のリダイレクトURIを追加 | 2分 | Google Cloud Console |
| 7 | Google Pub/Sub エンドポイントを更新 | 2分 | Google Cloud Console |
| 8 | 初回デプロイ | 3分 | ターミナル |

**合計: 約30分**

---

## 1. D1 データベースにスキーマを適用

Cloudflare ダッシュボードでD1のコンソールからSQLを実行します。

### 手順

1. https://dash.cloudflare.com → 「ストレージとデータベース」→「D1 SQL データベース」→ **mcia-db** を開く
2. **「コンソール」タブ** をクリック
3. 以下の **3つのバッチ** を順番にコピー＆ペーストして「Execute」を実行

#### バッチ1: Users + Auth.js テーブル（最初に実行）

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  "emailVerified" TEXT,
  image TEXT,
  line_user_id TEXT,
  stripe_customer_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'inactive' CHECK(subscription_status IN ('active', 'inactive', 'trial')),
  gmail_history_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  expires TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);
```

#### バッチ2: Agencies + Projects

```sql
CREATE TABLE IF NOT EXISTS agencies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  email_domain TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agencies_user_id ON agencies(user_id);
CREATE INDEX IF NOT EXISTS idx_agencies_email_domain ON agencies(email_domain);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agency_id TEXT,
  title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  location TEXT,
  compensation TEXT,
  genre TEXT,
  requires_pr INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'draft_created', 'entered', 'confirmed', 'decline_draft', 'declined', 'expired')),
  source_email_id TEXT,
  draft_email_id TEXT,
  sent_email_id TEXT,
  calendar_event_id TEXT,
  raw_email_body TEXT,
  parsed_data TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_projects_calendar_event ON projects(calendar_event_id);
```

#### バッチ3: その他全テーブル

```sql
CREATE TABLE IF NOT EXISTS email_classifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  gmail_message_id TEXT NOT NULL,
  from_address TEXT,
  subject TEXT,
  category TEXT NOT NULL CHECK(category IN ('recruitment', 'confirmation', 'decline_ack', 'other')),
  confidence REAL NOT NULL,
  reason TEXT,
  processed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(user_id, gmail_message_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_conflicts (
  id TEXT PRIMARY KEY,
  project_a_id TEXT NOT NULL,
  project_b_id TEXT NOT NULL,
  overlap_start TEXT NOT NULL,
  overlap_end TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(project_a_id, project_b_id),
  FOREIGN KEY (project_a_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (project_b_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_tracking (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  gmail_message_id TEXT,
  gmail_draft_id TEXT,
  type TEXT NOT NULL CHECK(type IN ('entry', 'decline')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'sent')),
  tracking_tag TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_tracking_tracking_tag ON email_tracking(tracking_tag);

CREATE TABLE IF NOT EXISTS pr_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  genre TEXT,
  pr_text TEXT NOT NULL,
  was_successful INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pr_history_user_genre ON pr_history(user_id, genre);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  type TEXT NOT NULL CHECK(type IN ('entry_ok', 'entry_ng', 'confirmed', 'decline_draft', 'decline_sent', 'classification_uncertain')),
  channel TEXT NOT NULL CHECK(channel IN ('line', 'web')),
  message TEXT NOT NULL,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
```

### 確認方法

実行後、「概要」タブに戻って **テーブル数が 11** になっていればOKです。

---

## 2. Stripe で商品・価格を作成

### 手順

1. https://dashboard.stripe.com にアクセス（アカウントがなければ作成）
2. **テストモード** になっていることを確認（右上のトグル）
3. 左メニュー「商品カタログ」→「+ 商品を追加」をクリック
4. 以下を入力:

| 項目 | 入力値 |
|------|--------|
| 商品名 | `MCia プロ` |
| 説明 | `MC・コンパニオン エントリー業務自動化` |
| 料金モデル | 標準の料金体系 |
| 金額 | `500` 円 |
| 請求期間 | 月次 |

5. 「商品を保存」をクリック
6. 作成された商品の詳細ページで、**価格ID**（`price_xxxxxxxxxxxxxxx` 形式）をコピー

> この価格IDが `STRIPE_PRICE_ID` になります。

---

## 3. Stripe Webhook を設定

### 手順

1. Stripe ダッシュボード → 左メニュー「開発者」→「Webhook」
2. 「エンドポイントを追加」をクリック
3. 以下を入力:

| 項目 | 入力値 |
|------|--------|
| エンドポイント URL | `https://mcia.あなたのドメイン/api/webhooks/stripe` |
| リッスンするイベント | 下記3つを選択 |

**選択するイベント:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

4. 「イベントを追加」→「エンドポイントを追加」をクリック
5. 作成されたエンドポイントの詳細ページで **「署名シークレット」を表示** してコピー（`whsec_xxxxxxx` 形式）

> この署名シークレットが `STRIPE_WEBHOOK_SECRET` になります。

### メモする値

```
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxx（「開発者」→「APIキー」から取得）
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxx
STRIPE_PRICE_ID=price_xxxxxxxxxxxxxxx
```

---

## 4. LINE Messaging API チャネルを作成

### 手順

1. https://developers.line.biz/console/ にアクセス（LINE アカウントでログイン）
2. プロバイダーがなければ「作成」→ プロバイダー名: `MCia`
3. 「新規チャネル作成」→ **「Messaging API」** を選択
4. 以下を入力:

| 項目 | 入力値 |
|------|--------|
| チャネル名 | `MCia` |
| チャネル説明 | `MC・コンパニオン エントリー業務自動化の通知` |
| 大業種 | `ウェブサービス` |
| 小業種 | `ウェブサービス（その他）` |

5. 利用規約に同意して「作成」

### Channel Secret を取得

1. 作成したチャネルの「チャネル基本設定」タブ
2. **チャネルシークレット** をコピー

### Channel Access Token を取得

1. 「Messaging API設定」タブ
2. ページ下部の「チャネルアクセストークン（長期）」→「発行」をクリック
3. 表示されたトークンをコピー

### Webhook URL を設定

1. 「Messaging API設定」タブ → 「Webhook設定」セクション
2. Webhook URL: `https://mcia.あなたのドメイン/api/webhooks/line`
3. 「Webhookの利用」を **ON** にする
4. 「検証」ボタンを押して成功することを確認（デプロイ後に実施）

### アカウント連携を設定

1. 「Messaging API設定」タブ → 「アカウント連携」セクション
2. 連携URL: `https://mcia.あなたのドメイン/setup`

### 応答メッセージを無効化

1. 「Messaging API設定」タブ → 「LINE公式アカウント機能」
2. 「応答メッセージ」→ 「編集」→ **「オフ」** に設定
3. 「あいさつメッセージ」→ 「編集」→ 必要に応じて設定

### メモする値

```
LINE_CHANNEL_SECRET=チャネルシークレット
LINE_CHANNEL_ACCESS_TOKEN=チャネルアクセストークン（長期）
```

---

## 5. Cloudflare Workers に環境変数を設定

ターミナルで以下のコマンドを **1つずつ** 実行します。
各コマンドの実行後、プロンプトに値を入力してEnterを押してください。

```bash
# Auth.js セッション暗号化用の秘密鍵（ランダム文字列を生成）
openssl rand -base64 32
# ↑ 出力された値を次のコマンドで入力

wrangler secret put AUTH_SECRET
wrangler secret put AUTH_GOOGLE_ID
wrangler secret put AUTH_GOOGLE_SECRET
wrangler secret put GOOGLE_CLOUD_PROJECT_ID
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put STRIPE_PRICE_ID
wrangler secret put LINE_CHANNEL_SECRET
wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
```

### 入力する値のまとめ

| 変数名 | 取得元 |
|--------|--------|
| `AUTH_SECRET` | `openssl rand -base64 32` で生成した値 |
| `AUTH_GOOGLE_ID` | Google Cloud Console → 認証情報 → OAuth クライアントID |
| `AUTH_GOOGLE_SECRET` | Google Cloud Console → 認証情報 → クライアントシークレット |
| `GOOGLE_CLOUD_PROJECT_ID` | Google Cloud Console → プロジェクトID |
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys |
| `STRIPE_SECRET_KEY` | Stripe → 開発者 → APIキー（`sk_test_...`） |
| `STRIPE_WEBHOOK_SECRET` | 手順3で取得した Webhook署名シークレット |
| `STRIPE_PRICE_ID` | 手順2で取得した価格ID |
| `LINE_CHANNEL_SECRET` | 手順4で取得したチャネルシークレット |
| `LINE_CHANNEL_ACCESS_TOKEN` | 手順4で取得したチャネルアクセストークン |

---

## 6. Google OAuth のリダイレクトURIを追加

本番のドメインをOAuth設定に追加します。

### 手順

1. https://console.cloud.google.com → 「APIとサービス」→「認証情報」
2. 既存の OAuth クライアントID (`MCia Web Client`) をクリック
3. 以下を **追加** する（既存の localhost 設定は残す）:

| 項目 | 追加する値 |
|------|-----------|
| 承認済みの JavaScript 生成元 | `https://mcia.あなたのドメイン` |
| 承認済みのリダイレクト URI | `https://mcia.あなたのドメイン/api/auth/callback/google` |

4. 「保存」をクリック

---

## 7. Google Pub/Sub エンドポイントを更新

### 手順

1. https://console.cloud.google.com → 「Pub/Sub」→「サブスクリプション」
2. `gmail-notifications-push` をクリック
3. 「編集」をクリック
4. エンドポイント URL を更新:
   - **変更前**: `https://example.com/api/webhooks/gmail`
   - **変更後**: `https://mcia.あなたのドメイン/api/webhooks/gmail`
5. 「更新」をクリック

---

## 8. 初回デプロイ

ターミナルで以下を実行:

```bash
cd /path/to/MCia
npm run cf:deploy
```

成功すると、デプロイURLが表示されます。

### デプロイ後の確認

- [ ] `https://mcia.あなたのドメイン` にアクセスしてランディングページが表示される
- [ ] 「ログイン」→ Google OAuth 画面が表示される
- [ ] LINE Developers → Webhook URL の「検証」ボタンが成功する

---

## 完了チェックリスト

全て完了したらチェックしてください:

- [ ] D1 にスキーマ適用済み（テーブル数: 11）
- [ ] Stripe 商品・価格 作成済み
- [ ] Stripe Webhook 設定済み
- [ ] LINE Messaging API チャネル作成済み
- [ ] Cloudflare Workers 環境変数 10個 設定済み
- [ ] Google OAuth リダイレクトURI 追加済み
- [ ] Google Pub/Sub エンドポイント更新済み
- [ ] 初回デプロイ成功
- [ ] ランディングページ表示確認
- [ ] Google ログイン確認

**全てチェックがついたら、MCia の本番環境は稼働開始です！**
