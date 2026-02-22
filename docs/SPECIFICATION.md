# MCia - MC/コンパニオン エントリー業務自動化アプリ 仕様書

## 1. プロダクト概要

### 1.1 プロダクト名
**MCia**（エムシア）

### 1.2 ミッション
MC・コンパニオンが複数事務所から受け取る案件募集メールへのエントリー作業、およびそれに伴うスケジュール管理・辞退連絡を自動化し、業務負担を大幅に軽減する。

### 1.3 ビジネスモデル
月額500円のサブスクリプション（税込想定）

---

## 2. 業界背景と課題

### 2.1 業界構造
- MC/コンパニオンは1人が複数の事務所（平均6〜7社）に所属
- 各事務所はメーリングリストで案件募集メールを所属MC宛に配信
- MC/コンパニオンはメールを確認し、個別に返信してエントリーする

### 2.2 現状の業務フロー（手動）
1. 各事務所からの案件募集メールを受信（1日に複数通）
2. メールの内容（日程・場所・報酬等）を確認
3. 自分のカレンダーで日程の空きを確認
4. 空いていればメールに返信してエントリー希望を伝える
5. カレンダーに「仮」予定として手動で登録
6. 案件が決定した場合、カレンダーを「確定」に更新
7. 決定案件と日程が重複する他の仮案件について、各事務所に辞退メールを個別送信
8. 辞退した案件をカレンダーから削除

### 2.3 課題
- 複数事務所からのメール管理が煩雑
- カレンダーへの手動反映が漏れやすい
- 日程重複の判定が複雑（部分的な重複も含む）
- 辞退連絡の送信漏れ・遅延
- 全体を通じてウェットなコミュニケーションコストが高い

---

## 3. ユーザーペルソナ

### 3.1 プライマリユーザー
- **職業**: MC / コンパニオン
- **所属事務所数**: 平均6〜7社
- **使用ツール**: Gmail、Googleカレンダー、LINE
- **課題**: 日々大量の案件メール管理と、それに伴うカレンダー管理・辞退連絡

### 3.2 将来的な拡張ユーザー
- Gmail以外のメールサービス利用者
- Googleカレンダー以外のスケジュールサービス利用者

---

## 4. 機能仕様

### 4.1 機能一覧

| # | 機能名 | 概要 | 優先度 |
|---|--------|------|--------|
| F1 | 案件メール解析 | 受信メールから案件情報（日程・場所・報酬等）を自動抽出 | P0 |
| F2 | スケジュール空き確認 | Googleカレンダーと連携し、案件日程の空き/重複を判定 | P0 |
| F3 | エントリー下書き自動作成 | 空きがある場合、参加希望メールの下書きを自動作成 | P0 |
| F4 | カレンダー仮予定登録 | エントリーメール**送信時**にカレンダーへ仮予定を自動登録 | P0 |
| F5 | LINE通知（エントリー） | エントリー処理結果（OK/NG+理由）をLINEで通知 | P0 |
| F6 | 決定時・辞退下書き自動作成 | 案件決定メール受信時、重複する他案件への辞退メール下書きを自動作成 | P0 |
| F7 | カレンダー確定更新 | 決定案件のカレンダー予定を「確定」に更新 | P0 |
| F8 | カレンダー予定削除 | 辞退メール**送信時**にカレンダーの該当仮予定を自動削除 | P0 |
| F9 | LINE通知（決定・辞退） | 決定・辞退処理の結果をLINEで通知 | P0 |
| F10 | ユーザー登録・認証 | Googleアカウント連携によるサインアップ/サインイン | P0 |
| F11 | 決済管理 | 月額500円のサブスクリプション管理 | P1 |
| F12 | ダッシュボード | 案件一覧・ステータス確認画面 | P1 |

### 4.2 詳細フロー

#### フロー1: エントリー処理（案件メール受信〜エントリー）

```
[事務所] 案件募集メール送信
    ↓
[MCia] Gmailで案件メールを検知（Gmail API / Pub/Sub）
    ↓
[MCia] メール本文から案件情報を抽出（AI解析）
    ├─ 案件名
    ├─ 日程（開始日〜終了日）
    ├─ 場所
    ├─ 報酬
    ├─ 送信元事務所
    └─ その他条件
    ↓
[MCia] Googleカレンダーで日程の空き確認
    ↓
┌─ 空きあり ──────────────────────────┐
│  [MCia] エントリー希望メールの下書きを    │
│         Gmailに自動作成                │
│  [MCia] LINEで通知                    │
│         「○○案件（MM/DD〜MM/DD）に      │
│          エントリー下書きを作成しました」   │
│    ↓                                  │
│  [ユーザー] 下書きを確認・送信            │
│    ↓                                  │
│  [MCia] メール送信を検知                 │
│  [MCia] Googleカレンダーに仮予定を登録    │
│  [MCia] LINEで通知                     │
│         「○○案件をカレンダーに登録しました」│
└──────────────────────────────────────┘

┌─ 重複あり（NG）──────────────────────┐
│  [MCia] LINEで通知                    │
│         「○○案件（MM/DD〜MM/DD）は      │
│          スケジュールが重複しています。    │
│          重複: △△案件（MM/DD〜MM/DD）」  │
│  ※ 下書きは作成しない                   │
└──────────────────────────────────────┘
```

#### フロー2: 決定・辞退処理

```
[事務所] 案件決定メール送信
    ↓
[MCia] Gmailで決定メールを検知
    ↓
[MCia] 決定した案件を特定
    ↓
[MCia] カレンダー上の該当予定を「確定」に更新
    ↓
[MCia] 決定案件の日程と重複する他の仮予定を検索
    ↓
[MCia] 重複する各案件について辞退メールの下書きを自動作成
       （件名例:「辞退のご連絡 - ○○案件」）
       （本文例:「今回は別日程にて他決が出たため、
                辞退させていただきます。」）
    ↓
[MCia] LINEで通知
       「○○案件が決定しました。
        以下の案件の辞退下書きを作成しました:
        ・△△案件（MM/DD〜MM/DD）
        ・□□案件（MM/DD〜MM/DD）」
    ↓
[ユーザー] 辞退下書きを確認・送信
    ↓
[MCia] 辞退メール送信を検知
[MCia] 送信された辞退案件のカレンダー仮予定を削除
[MCia] LINEで通知
       「△△案件の辞退が完了し、カレンダーから削除しました」
```

### 4.3 日程重複判定ロジック

案件の日程は「開始日〜終了日」の範囲で管理する。

**重複の定義**: 2つの案件A・Bについて、日程範囲が1日でも重なる場合は「重複」と判定する。

**例:**
```
A案件: 17日〜20日
B案件: 19日〜23日
C案件: 22日のみ

重複関係:
  A ↔ B: 19日・20日が重複 → 重複あり
  A ↔ C: 重複なし
  B ↔ C: 22日が重複 → 重複あり
```

**C案件が決定した場合:**
- Cと重複するB → 辞退対象
- BとCが重複 → Bは辞退。Bが辞退されることでAとの重複は解消されるが、
  **Bはフル日程（19〜23日）参加できなくなるため辞退対象**
- つまり、決定案件と「直接的または間接的に日程が重複し、フル日程参加が不可能になる仮案件」は全て辞退対象

**辞退判定アルゴリズム:**
1. 決定案件の日程範囲を取得
2. カレンダー上の全仮予定を取得
3. 決定案件の日程と1日でも重複する仮予定を辞退候補とする
4. ※将来的には間接重複（連鎖的な重複）も考慮する拡張を検討

---

## 5. システムアーキテクチャ

### 5.1 技術スタック

| レイヤー | 技術 | 理由 |
|---------|------|------|
| フロントエンド | Next.js (React) + TypeScript | SSR対応、型安全性 |
| バックエンド | Next.js API Routes + Node.js | フロントと統合、サーバーレス対応 |
| データベース | PostgreSQL (Supabase) | リレーショナルデータ管理、Supabaseで認証・リアルタイム機能も活用 |
| 認証 | Supabase Auth + Google OAuth | Googleアカウント連携が必須要件 |
| メール連携 | Gmail API (Google Workspace) | Gmailの読取・下書き作成・送信検知 |
| カレンダー連携 | Google Calendar API | 予定の読取・作成・更新・削除 |
| メール解析 | Claude API | 案件メールからの情報抽出 |
| LINE通知 | LINE Messaging API | ユーザーへのプッシュ通知 |
| 決済 | Stripe | サブスクリプション管理 |
| ホスティング | Vercel | Next.jsとの親和性、自動デプロイ |
| ジョブ管理 | Vercel Cron / BullMQ | 定期的なメール監視・バッチ処理 |

### 5.2 システム構成図

```
┌─────────────────────────────────────────────────┐
│                    ユーザー                       │
│         (MC / コンパニオン)                       │
├──────────┬──────────┬──────────┬────────────────┤
│  Gmail   │ Google   │  LINE   │  MCia Web App  │
│          │ Calendar │         │  (ブラウザ)      │
└────┬─────┴────┬─────┴────┬────┴───────┬────────┘
     │          │          │            │
     ▼          ▼          ▼            ▼
┌─────────────────────────────────────────────────┐
│              MCia Backend (Next.js)              │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐│
│  │ Gmail    │ │ Calendar │ │ LINE Messaging   ││
│  │ Service  │ │ Service  │ │ Service          ││
│  └────┬─────┘ └────┬─────┘ └────────┬─────────┘│
│       │            │                 │          │
│  ┌────▼────────────▼─────────────────▼─────────┐│
│  │         Core Business Logic                  ││
│  │  ┌─────────────┐  ┌──────────────────────┐  ││
│  │  │ メール解析   │  │ スケジュール重複判定  │  ││
│  │  │ (Claude API) │  │                      │  ││
│  │  └─────────────┘  └──────────────────────┘  ││
│  └──────────────────────┬──────────────────────┘│
│                         │                        │
│  ┌──────────────────────▼──────────────────────┐│
│  │            Supabase (PostgreSQL)             ││
│  │  users / agencies / projects / entries       ││
│  └─────────────────────────────────────────────┘│
│                                                  │
│  ┌─────────────────────────────────────────────┐│
│  │            Stripe (決済)                     ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

### 5.3 Gmail監視方式

**Google Pub/Sub + Gmail Push Notification**を採用:
- GmailのPush Notification機能でメール受信をリアルタイム検知
- 新着メール → Cloud Pub/Sub → MCia Webhook → 処理開始
- メール送信検知も同様にPush Notificationで検知（SENT ラベル監視）

### 5.4 メール送信検知の仕組み

カレンダー操作のトリガーは「メール送信」であるため、以下の方式で検知:

1. **Gmail Push Notification**: `SENT`ラベルの変更を監視
2. MCiaが作成した下書きには、内部的な識別情報（カスタムヘッダー or 本文末尾の非表示タグ）を付与
3. 送信済みメールから識別情報を読み取り、対応する案件を特定
4. 案件種別（エントリー/辞退）に応じたカレンダー操作を実行

---

## 6. データベース設計

### 6.1 ER図（主要テーブル）

```
users
├── id (UUID, PK)
├── email (VARCHAR, UNIQUE)
├── name (VARCHAR)
├── google_access_token (TEXT, encrypted)
├── google_refresh_token (TEXT, encrypted)
├── line_user_id (VARCHAR, nullable)
├── stripe_customer_id (VARCHAR, nullable)
├── subscription_status (ENUM: active, inactive, trial)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

agencies (所属事務所)
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── name (VARCHAR)
├── email (VARCHAR)  ← 事務所のメールアドレス
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

projects (案件)
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── agency_id (UUID, FK → agencies, nullable)
├── title (VARCHAR)
├── start_date (DATE)
├── end_date (DATE)
├── location (VARCHAR, nullable)
├── compensation (VARCHAR, nullable)
├── status (ENUM: new, draft_created, entered, confirmed, declined, expired)
├── source_email_id (VARCHAR)  ← Gmail Message ID
├── draft_email_id (VARCHAR, nullable)  ← 作成した下書きのGmail ID
├── calendar_event_id (VARCHAR, nullable)  ← Googleカレンダー Event ID
├── raw_email_body (TEXT)
├── parsed_data (JSONB)  ← AI解析結果
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

project_conflicts (案件間の日程重複関係)
├── id (UUID, PK)
├── project_a_id (UUID, FK → projects)
├── project_b_id (UUID, FK → projects)
├── overlap_start (DATE)
├── overlap_end (DATE)
├── created_at (TIMESTAMP)
└── UNIQUE(project_a_id, project_b_id)

notifications (通知履歴)
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── project_id (UUID, FK → projects, nullable)
├── type (ENUM: entry_ok, entry_ng, confirmed, decline_draft, decline_sent)
├── channel (ENUM: line, email, web)
├── message (TEXT)
├── sent_at (TIMESTAMP)
└── created_at (TIMESTAMP)

email_tracking (メール追跡)
├── id (UUID, PK)
├── user_id (UUID, FK → users)
├── project_id (UUID, FK → projects)
├── gmail_message_id (VARCHAR)
├── gmail_draft_id (VARCHAR, nullable)
├── type (ENUM: entry, decline)
├── status (ENUM: draft, sent)
├── tracking_tag (VARCHAR, UNIQUE)  ← 下書きに埋め込む識別タグ
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

### 6.2 ステータス遷移

```
案件(project)のステータス遷移:

  new (メール受信・解析完了)
   │
   ├─ [空きあり] → draft_created (下書き作成済み)
   │                    │
   │                    └─ [メール送信検知] → entered (エントリー済み/仮予定登録)
   │                                            │
   │                                            ├─ [決定メール受信] → confirmed (確定)
   │                                            │
   │                                            └─ [辞退下書き作成] → draft_created (辞退下書き)
   │                                                   │
   │                                                   └─ [辞退メール送信] → declined (辞退完了/予定削除)
   │
   └─ [重複あり] → (通知のみ、ステータス変更なし or expired)
```

---

## 7. API設計

### 7.1 認証関連
| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/api/auth/google` | Google OAuth開始 |
| GET | `/api/auth/google/callback` | OAuthコールバック |
| POST | `/api/auth/line/connect` | LINE連携 |
| POST | `/api/auth/logout` | ログアウト |

### 7.2 ユーザー関連
| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/api/users/me` | ユーザー情報取得 |
| PUT | `/api/users/me` | ユーザー情報更新 |
| GET | `/api/users/me/subscription` | サブスク状態確認 |

### 7.3 事務所関連
| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/api/agencies` | 所属事務所一覧 |
| POST | `/api/agencies` | 事務所登録 |
| PUT | `/api/agencies/:id` | 事務所情報更新 |
| DELETE | `/api/agencies/:id` | 事務所削除 |

### 7.4 案件関連
| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/api/projects` | 案件一覧 |
| GET | `/api/projects/:id` | 案件詳細 |
| PUT | `/api/projects/:id/status` | ステータス更新 |
| GET | `/api/projects/:id/conflicts` | 重複案件確認 |

### 7.5 Webhook
| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/api/webhooks/gmail` | Gmail Push Notification受信 |
| POST | `/api/webhooks/stripe` | Stripe Webhook |
| POST | `/api/webhooks/line` | LINE Webhook |

### 7.6 通知関連
| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/api/notifications` | 通知履歴 |

---

## 8. 外部サービス連携仕様

### 8.1 Gmail API
**必要なスコープ:**
- `gmail.readonly` - メール読取
- `gmail.compose` - 下書き作成
- `gmail.send` - メール送信(将来用)
- `gmail.modify` - ラベル操作

**利用する機能:**
- `users.messages.list` / `users.messages.get` - メール取得
- `users.drafts.create` - 下書き作成
- `users.watch` - Push Notification設定
- `users.history.list` - 変更履歴取得（送信検知用）

### 8.2 Google Calendar API
**必要なスコープ:**
- `calendar.events` - カレンダー読書き

**利用する機能:**
- `events.list` - 予定取得（空き確認）
- `events.insert` - 仮予定作成
- `events.update` - 予定更新（仮→確定）
- `events.delete` - 予定削除（辞退時）

**カレンダー予定のフォーマット:**
```
仮予定:
  タイトル: 【仮】○○案件 - △△事務所
  色: 黄色(banana)
  説明: MCia自動登録 | 案件ID: xxx

確定予定:
  タイトル: 【確定】○○案件 - △△事務所
  色: 緑(sage)
  説明: MCia自動登録 | 案件ID: xxx
```

### 8.3 LINE Messaging API
**利用する機能:**
- Push Message - ユーザーへの通知送信

**通知テンプレート:**

| イベント | メッセージ例 |
|---------|------------|
| エントリー下書き作成 | 📩 ○○案件（1/17〜1/20）のエントリー下書きを作成しました。Gmailで確認してください。 |
| スケジュール重複(NG) | ⚠️ ○○案件（1/17〜1/20）はスケジュールが重複しています。重複: △△案件（1/18〜1/19） |
| エントリーメール送信検知 | ✅ ○○案件のエントリーメールを送信しました。カレンダーに仮予定を登録しました。 |
| 案件決定 | 🎉 ○○案件が決定しました！以下の案件の辞退下書きを作成しました:・△△案件・□□案件 |
| 辞退メール送信検知 | 📤 △△案件の辞退メールを送信しました。カレンダーから予定を削除しました。 |

### 8.4 Claude API（メール解析）
**用途:** 案件募集メールの本文からの構造化データ抽出

**抽出項目:**
- 案件名/イベント名
- 日程（開始日・終了日）
- 場所/会場
- 報酬/ギャランティ
- 募集条件
- 送信元事務所名
- メールの種別判定（案件募集 / 決定連絡 / その他）

---

## 9. セキュリティ要件

- Google OAuth トークンはサーバーサイドで暗号化して保管
- APIエンドポイントは全て認証必須
- Webhook エンドポイントは署名検証を実装
- HTTPS通信のみ
- 個人情報の取り扱いはプライバシーポリシーに準拠
- Supabase Row Level Security (RLS) でユーザー間のデータ分離

---

## 10. 将来的な拡張計画

### Phase 2
- Outlook / Yahoo Mail 対応
- Apple Calendar / Outlook Calendar 対応
- 案件の自動マッチング・レコメンド機能

### Phase 3
- 事務所側の管理画面
- 複数MC間の日程調整機能
- 報酬管理・請求書自動生成

---

## 11. 画面構成

### 11.1 画面一覧

| # | 画面名 | パス | 説明 |
|---|--------|------|------|
| S1 | ランディングページ | `/` | サービス紹介・登録導線 |
| S2 | ログイン | `/login` | Google OAuth ログイン |
| S3 | 初期設定 | `/setup` | Gmail/カレンダー/LINE連携設定 |
| S4 | ダッシュボード | `/dashboard` | 案件一覧・ステータス概要 |
| S5 | 案件詳細 | `/projects/:id` | 案件の詳細情報・アクション |
| S6 | カレンダー表示 | `/calendar` | 月間/週間カレンダーで案件表示 |
| S7 | 事務所管理 | `/agencies` | 所属事務所の登録・管理 |
| S8 | 設定 | `/settings` | アカウント・連携・通知設定 |
| S9 | サブスクリプション | `/subscription` | プラン・支払い管理 |
