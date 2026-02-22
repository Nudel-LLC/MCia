# MCia - MC/コンパニオン エントリー業務自動化アプリ 仕様書

## 1. プロダクト概要

### 1.1 プロダクト名
**MCia**（エムシア）

### 1.2 ミッション
MC・コンパニオンが複数事務所から受け取る案件募集メールへのエントリー作業、およびそれに伴うスケジュール管理・辞退連絡を自動化し、業務負担を大幅に軽減する。

### 1.3 ビジネスモデル
月額500円のサブスクリプション（税込想定）

### 1.4 想定規模
- 初期ターゲット: 1,000名のユーザー
- 月間売上目標: 50万円（1,000名 × 500円）

---

## 2. 業界背景と課題

### 2.1 業界構造
- MC/コンパニオンは1人が複数の事務所（平均6〜7社）に所属
- 各事務所はメーリングリストで案件募集メールを所属MC宛に配信
- MC/コンパニオンはメールを確認し、個別に返信してエントリーする
- **事務所ごとにメールの書式・フォーマットが異なる**（統一規格なし）

### 2.2 現状の業務フロー（手動）
1. 各事務所からの案件募集メールを受信（1日に複数通）
2. メールの内容（日程・場所・報酬等）を確認
3. 自分のカレンダーで日程の空きを確認
4. 空いていればメールに返信してエントリー希望を伝える
5. エントリー時に自己PR（過去の実績等）を添えることも多い
6. カレンダーに「仮」予定として手動で登録
7. 案件が決定した場合、カレンダーを「確定」に更新
8. 決定案件と日程が重複する他の仮案件について、各事務所に辞退メールを個別送信
9. 辞退した案件をカレンダーから削除

### 2.3 課題
- 複数事務所からのメール管理が煩雑
- **事務所ごとにメール形式が異なり、案件情報の読み取りに時間がかかる**
- カレンダーへの手動反映が漏れやすい
- 日程重複の判定が複雑（部分的な重複も含む）
- 辞退連絡の送信漏れ・遅延
- **エントリー時のPR文面作成が面倒（毎回似た内容を書く）**
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
| F0 | メール分類判定 | 受信メールを「案件募集」「決定連絡」「その他」に分類 | P0 |
| F1 | 案件メール解析 | 分類後のメールから案件情報（日程・場所・報酬等）を自動抽出 | P0 |
| F2 | スケジュール空き確認 | Googleカレンダーと連携し、案件日程の空き/重複を判定 | P0 |
| F3 | エントリー下書き自動作成 | 空きがある場合、参加希望メールの下書きを自動作成 | P0 |
| F3a | PR自動まとめ | 案件にPR要素がある場合、過去の類似案件実績からPR文を自動生成し下書きに含める | P0 |
| F4 | カレンダー仮予定登録 | エントリーメール**送信時**にカレンダーへ仮予定を自動登録 | P0 |
| F5 | LINE通知（エントリー） | エントリー処理結果（OK/NG+理由）をLINEで通知 | P0 |
| F6 | 決定時・辞退下書き自動作成 | 案件決定メール受信時、重複する他案件への辞退メール下書きを自動作成 | P0 |
| F7 | カレンダー確定更新 | 決定案件のカレンダー予定を「確定」に更新 | P0 |
| F8 | カレンダー予定削除 | 辞退メール**送信時**にカレンダーの該当仮予定を自動削除 | P0 |
| F9 | LINE通知（決定・辞退） | 決定・辞退処理の結果をLINEで通知 | P0 |
| F10 | ユーザー登録・認証 | Googleアカウント連携によるサインアップ/サインイン | P0 |
| F11 | 決済管理 | 月額500円のサブスクリプション管理 | P1 |
| F12 | ダッシュボード | 案件一覧・ステータス確認画面 | P1 |

### 4.2 メール分類判定フロー（F0）

事務所ごとにメールの書式が異なるため、受信メールをまず分類する。

```
[MCia] 受信メールを検知
    ↓
[MCia] Step 1: ドメイン/送信元フィルタリング
    │  ユーザーが登録した事務所のメールアドレス/ドメインと照合
    │  → 該当しない場合はスキップ（処理対象外）
    ↓
[MCia] Step 2: AI分類判定（Claude Haiku）
    │  メール本文を解析し、以下のカテゴリに分類:
    │
    ├─ 「案件募集」 → フロー1（エントリー処理）へ
    │    判定基準: 日程・場所・報酬などの案件情報を含む
    │
    ├─ 「決定連絡」 → フロー2（決定・辞退処理）へ
    │    判定基準: 「決定」「採用」「アサイン」等のキーワード + 案件特定情報
    │
    ├─ 「辞退受理」 → ログのみ記録
    │    判定基準: 辞退に対する事務所からの返信
    │
    └─ 「その他」 → スキップ
         判定基準: 上記に該当しない事務連絡等
```

**AI分類のプロンプト設計:**
- 入力: メール件名 + 本文（先頭2000文字）
- 出力: `{ category: "recruitment" | "confirmation" | "decline_ack" | "other", confidence: 0.0-1.0, reason: "..." }`
- confidence < 0.7 の場合はLINEでユーザーに確認通知を送信
- モデル: **Claude Haiku**（低コスト・高速処理）

### 4.3 詳細フロー

#### フロー1: エントリー処理（案件メール受信〜エントリー）

```
[事務所] 案件募集メール送信
    ↓
[MCia] Gmailで案件メールを検知（Gmail API / Pub/Sub）
    ↓
[MCia] メール分類判定 → 「案件募集」と判定
    ↓
[MCia] メール本文から案件情報を抽出（Claude Haiku）
    ├─ 案件名
    ├─ 日程（開始日〜終了日）
    ├─ 場所
    ├─ 報酬
    ├─ 送信元事務所
    ├─ PR要素の有無（自己PR記載が求められているか）
    └─ その他条件
    ↓
[MCia] Googleカレンダーで日程の空き確認
    ↓
┌─ 空きあり ──────────────────────────────────┐
│  [MCia] エントリー希望メールの下書きを             │
│         Gmailに自動作成                         │
│                                                │
│  ┌─ PR要素あり ─────────────────────────────┐ │
│  │ [MCia] 過去の処理済み案件DBから                │ │
│  │        類似案件・関連実績を検索                 │ │
│  │ [MCia] PR文面を自動生成し下書きに含める         │ │
│  │        （過去実績の要約 + 案件との関連性）       │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  [MCia] LINEで通知                              │
│         「○○案件（MM/DD〜MM/DD）に               │
│          エントリー下書きを作成しました」            │
│    ↓                                            │
│  [ユーザー] 下書きを確認・必要に応じて編集・送信     │
│    ↓                                            │
│  [MCia] メール送信を検知                          │
│  [MCia] Googleカレンダーに仮予定を登録             │
│  [MCia] LINEで通知                               │
│         「○○案件をカレンダーに登録しました」         │
└────────────────────────────────────────────────┘

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
[MCia] メール分類判定 → 「決定連絡」と判定
    ↓
[MCia] 決定した案件を特定（メール内容とDB照合）
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

### 4.4 PR自動まとめ機能（F3a）

#### 概要
案件募集メールにPR（自己紹介・実績アピール）を求める要素が含まれている場合、過去に処理した案件の中から類似案件や関連実績を自動検索し、PR文面を生成してエントリー下書きに含める。

#### 処理フロー

```
[MCia] 案件解析時にPR要素を検出
    ↓
[MCia] 過去の案件DBから以下の条件で検索:
    ├─ 同じ業種・ジャンルの案件（展示会、イベント、司会等）
    ├─ 同じクライアント/同系統の案件
    ├─ 類似の会場・規模の案件
    └─ confirmed（確定）ステータスの案件を優先
    ↓
[MCia] 検索結果をもとにPR文面を生成（Claude Haiku）
    │  入力: 今回の案件情報 + 過去の類似案件リスト
    │  出力: 案件に最適化されたPR文（200〜400文字程度）
    │
    │  例:
    │  「これまで○○展示会（2025年）、△△モーターショー（2024年）
    │   など、展示会MCを多数経験しております。
    │   ○○メーカー様のブースMCも過去2回担当させていただき、
    │   製品説明にも自信がございます。」
    ↓
[MCia] 生成したPR文をエントリー下書きの本文に挿入
       （ユーザーが編集可能な形で）
```

#### PR文生成のルール
- 過去案件が0件の場合: PR欄は空欄にし、ユーザーに手動記入を促す注釈を付ける
- ユーザーが過去に手動で書いたPR文がある場合: それも参考情報として活用
- 生成されたPR文は下書き内で明示的に区切り、ユーザーが容易に編集・削除できる形にする

### 4.5 日程重複判定ロジック

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
| バックエンド | Cloudflare Workers (Hono) | エッジ実行、低レイテンシ、コスト効率 |
| フロントエンドホスティング | Cloudflare Pages | Workersとの統合、グローバルCDN |
| データベース | Cloudflare D1 (SQLite) | Workers native、1,000ユーザー規模に最適 |
| KVストア | Cloudflare KV | セッション管理、一時データキャッシュ |
| キュー | Cloudflare Queues | 非同期ジョブ処理（メール解析等） |
| 定期実行 | Cloudflare Cron Triggers | Gmail watch更新、定期バッチ |
| 認証 | Google OAuth 2.0（自前実装） | Googleアカウント連携が必須要件 |
| メール連携 | Gmail API (Google Workspace) | Gmailの読取・下書き作成・送信検知 |
| カレンダー連携 | Google Calendar API | 予定の読取・作成・更新・削除 |
| メール解析・分類 | Claude Haiku API | 低コスト・高速なメール分類・情報抽出 |
| LINE通知 | LINE Messaging API | ユーザーへのプッシュ通知 |
| 決済 | Stripe | サブスクリプション管理 |

### 5.2 Cloudflare採用理由

| 観点 | Cloudflare | 備考 |
|------|-----------|------|
| コスト | Workers Free: 10万リクエスト/日、Paid: $5/月で1,000万リクエスト | 1,000ユーザーに十分 |
| D1 | Free: 5GB、100Kリクエスト/日 | 1,000ユーザーのデータに十分 |
| レイテンシ | エッジ実行で低レイテンシ | Webhook応答が高速 |
| スケーラビリティ | 自動スケール | サーバー管理不要 |
| Queues | 非同期処理に最適 | メール解析をバックグラウンド処理 |

### 5.3 コスト試算（1,000ユーザー）

#### AI処理コスト（Claude Haiku）
| 処理 | 頻度/ユーザー/月 | Input tokens | Output tokens | 単価 | 月額コスト |
|------|----------------|-------------|--------------|------|----------|
| メール分類判定 | 150通 | ~500 | ~100 | $0.25/1M in, $1.25/1M out | ~$0.02/ユーザー |
| 案件情報抽出 | 50通(募集のみ) | ~2,000 | ~500 | 同上 | ~$0.03/ユーザー |
| PR文生成 | 20通(PR要素あり) | ~3,000 | ~500 | 同上 | ~$0.02/ユーザー |
| **合計** | | | | | **~$70/月（全ユーザー）** |

※ Claude Haiku: Input $0.25/1M tokens, Output $1.25/1M tokens

#### インフラコスト
| サービス | 月額 |
|---------|------|
| Cloudflare Workers Paid | $5 |
| Cloudflare D1 | 無料枠内 |
| Cloudflare KV | 無料枠内 |
| Cloudflare Queues | ~$1 |
| Google Cloud (Pub/Sub) | ~$5 |
| Claude Haiku API | ~$70 |
| Stripe手数料 | 3.6% ≈ $130 |
| **合計** | **~$211/月（≈3.2万円）** |

#### 収支概算
- 月間売上: 50万円（1,000名 × 500円）
- 月間コスト: ~3.2万円
- **粗利: ~46.8万円（粗利率 93.6%）**

### 5.4 システム構成図

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
│         Cloudflare Edge Network                  │
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │          Cloudflare Pages (Frontend)         ││
│  │          Next.js SSR/SSG                     ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │          Cloudflare Workers (API)            ││
│  │          Hono Framework                      ││
│  │                                              ││
│  │  ┌─────────────┐  ┌────────────────────┐    ││
│  │  │ Webhook     │  │ REST API           │    ││
│  │  │ Handlers    │  │ Endpoints          │    ││
│  │  └──────┬──────┘  └────────┬───────────┘    ││
│  │         │                  │                 ││
│  │  ┌──────▼──────────────────▼───────────┐    ││
│  │  │      Core Business Logic            │    ││
│  │  │  ┌──────────────┐ ┌──────────────┐  │    ││
│  │  │  │ メール分類    │ │ スケジュール  │  │    ││
│  │  │  │ (Haiku)      │ │ 重複判定     │  │    ││
│  │  │  └──────────────┘ └──────────────┘  │    ││
│  │  │  ┌──────────────┐ ┌──────────────┐  │    ││
│  │  │  │ 案件解析     │ │ PR自動生成   │  │    ││
│  │  │  │ (Haiku)      │ │ (Haiku)      │  │    ││
│  │  │  └──────────────┘ └──────────────┘  │    ││
│  │  └────────────────────────────────────┘    ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  ┌──────────────┐ ┌──────────┐ ┌──────────────┐│
│  │ Cloudflare   │ │ Cloudflare│ │ Cloudflare   ││
│  │ D1 (SQLite)  │ │ KV       │ │ Queues       ││
│  │ メインDB     │ │ セッション │ │ 非同期処理   ││
│  └──────────────┘ └──────────┘ └──────────────┘│
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │ Cron Triggers                                ││
│  │ ・Gmail watch更新（毎日）                     ││
│  │ ・期限切れ案件クリーンアップ（毎日）            ││
│  └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
          │           │            │
          ▼           ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ Gmail    │ │ Google   │ │ LINE     │
    │ API      │ │ Calendar │ │ Messaging│
    │          │ │ API      │ │ API      │
    └──────────┘ └──────────┘ └──────────┘
          │                        │
          ▼                        ▼
    ┌──────────┐           ┌──────────┐
    │ Google   │           │ Stripe   │
    │ Pub/Sub  │           │          │
    └──────────┘           └──────────┘
          │
          ▼
    ┌──────────┐
    │ Claude   │
    │ Haiku    │
    │ API      │
    └──────────┘
```

### 5.5 Gmail監視方式

**Google Pub/Sub + Gmail Push Notification**を採用:
- GmailのPush Notification機能でメール受信をリアルタイム検知
- 新着メール → Google Pub/Sub → Cloudflare Workers Webhook → Queues → 処理開始
- メール送信検知も同様にPush Notificationで検知（SENT ラベル監視）
- Gmail watchの有効期限は7日間のため、Cron Triggerで毎日更新

### 5.6 メール送信検知の仕組み

カレンダー操作のトリガーは「メール送信」であるため、以下の方式で検知:

1. **Gmail Push Notification**: `SENT`ラベルの変更を監視
2. MCiaが作成した下書きには、内部的な識別情報（本文末尾の非表示タグ `<!-- mcia:tracking_id:xxx -->` ）を付与
3. 送信済みメールから識別情報を読み取り、対応する案件を特定
4. 案件種別（エントリー/辞退）に応じたカレンダー操作を実行

**メール送信→カレンダー操作の対応:**

| 送信されたメールの種別 | カレンダー操作 |
|---------------------|-------------|
| エントリーメール | 仮予定を**作成** |
| 辞退メール | 該当仮予定を**削除** |

---

## 6. データベース設計

### 6.1 ER図（主要テーブル）

```
users
├── id (TEXT, PK, ULID)
├── email (TEXT, UNIQUE)
├── name (TEXT)
├── google_access_token (TEXT, encrypted)
├── google_refresh_token (TEXT, encrypted)
├── google_token_expires_at (INTEGER)
├── line_user_id (TEXT, nullable)
├── stripe_customer_id (TEXT, nullable)
├── subscription_status (TEXT: 'active' | 'inactive' | 'trial')
├── gmail_history_id (TEXT, nullable)  ← Gmail Push Notification用
├── created_at (TEXT, ISO8601)
└── updated_at (TEXT, ISO8601)

agencies (所属事務所)
├── id (TEXT, PK, ULID)
├── user_id (TEXT, FK → users)
├── name (TEXT)
├── email (TEXT)  ← 事務所のメールアドレス
├── email_domain (TEXT)  ← ドメイン部分（フィルタリング用）
├── created_at (TEXT, ISO8601)
└── updated_at (TEXT, ISO8601)

projects (案件)
├── id (TEXT, PK, ULID)
├── user_id (TEXT, FK → users)
├── agency_id (TEXT, FK → agencies, nullable)
├── title (TEXT)
├── start_date (TEXT, ISO8601 date)
├── end_date (TEXT, ISO8601 date)
├── location (TEXT, nullable)
├── compensation (TEXT, nullable)
├── genre (TEXT, nullable)  ← 案件ジャンル（展示会、イベント、司会等）
├── requires_pr (INTEGER, 0|1)  ← PR要素の有無
├── status (TEXT: 'new' | 'draft_created' | 'entered' | 'confirmed' | 'decline_draft' | 'declined' | 'expired')
├── source_email_id (TEXT)  ← Gmail Message ID（受信メール）
├── draft_email_id (TEXT, nullable)  ← 作成した下書きのGmail Draft ID
├── sent_email_id (TEXT, nullable)  ← 送信後のGmail Message ID
├── calendar_event_id (TEXT, nullable)  ← Googleカレンダー Event ID
├── raw_email_body (TEXT)
├── parsed_data (TEXT, JSON)  ← AI解析結果
├── created_at (TEXT, ISO8601)
└── updated_at (TEXT, ISO8601)

email_classifications (メール分類履歴)
├── id (TEXT, PK, ULID)
├── user_id (TEXT, FK → users)
├── gmail_message_id (TEXT)
├── from_address (TEXT)
├── subject (TEXT)
├── category (TEXT: 'recruitment' | 'confirmation' | 'decline_ack' | 'other')
├── confidence (REAL)
├── reason (TEXT)
├── processed (INTEGER, 0|1)
├── created_at (TEXT, ISO8601)
└── UNIQUE(user_id, gmail_message_id)

project_conflicts (案件間の日程重複関係)
├── id (TEXT, PK, ULID)
├── project_a_id (TEXT, FK → projects)
├── project_b_id (TEXT, FK → projects)
├── overlap_start (TEXT, ISO8601 date)
├── overlap_end (TEXT, ISO8601 date)
├── created_at (TEXT, ISO8601)
└── UNIQUE(project_a_id, project_b_id)

email_tracking (メール追跡)
├── id (TEXT, PK, ULID)
├── user_id (TEXT, FK → users)
├── project_id (TEXT, FK → projects)
├── gmail_message_id (TEXT, nullable)
├── gmail_draft_id (TEXT, nullable)
├── type (TEXT: 'entry' | 'decline')
├── status (TEXT: 'draft' | 'sent')
├── tracking_tag (TEXT, UNIQUE)  ← 下書きに埋め込む識別タグ
├── created_at (TEXT, ISO8601)
└── updated_at (TEXT, ISO8601)

pr_history (PR実績履歴)
├── id (TEXT, PK, ULID)
├── user_id (TEXT, FK → users)
├── project_id (TEXT, FK → projects)
├── genre (TEXT)  ← 案件ジャンル
├── pr_text (TEXT)  ← 実際に送信されたPR文
├── was_successful (INTEGER, 0|1)  ← 案件が確定したかどうか
├── created_at (TEXT, ISO8601)
└── updated_at (TEXT, ISO8601)

notifications (通知履歴)
├── id (TEXT, PK, ULID)
├── user_id (TEXT, FK → users)
├── project_id (TEXT, FK → projects, nullable)
├── type (TEXT: 'entry_ok' | 'entry_ng' | 'confirmed' | 'decline_draft' | 'decline_sent' | 'classification_uncertain')
├── channel (TEXT: 'line' | 'web')
├── message (TEXT)
├── sent_at (TEXT, ISO8601)
└── created_at (TEXT, ISO8601)
```

### 6.2 ステータス遷移

```
案件(project)のステータス遷移:

  new (メール受信・分類・解析完了)
   │
   ├─ [空きあり] → draft_created (エントリー下書き作成済み)
   │                    │
   │                    └─ [エントリーメール送信検知] → entered (エントリー済み + 仮予定登録)
   │                                                      │
   │                                                      ├─ [決定メール受信] → confirmed (確定 + カレンダー確定)
   │                                                      │
   │                                                      └─ [他案件決定により辞退対象] → decline_draft (辞退下書き作成済み)
   │                                                                                        │
   │                                                                                        └─ [辞退メール送信検知] → declined (辞退完了 + 予定削除)
   │
   └─ [重複あり] → expired (通知のみ)
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
| GET | `/api/auth/me` | 認証状態確認 |

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
| GET | `/api/projects` | 案件一覧（フィルタ・ページネーション対応） |
| GET | `/api/projects/:id` | 案件詳細 |
| PUT | `/api/projects/:id/status` | ステータス手動更新 |
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

### 7.7 分類関連
| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/api/classifications` | 分類履歴一覧 |
| PUT | `/api/classifications/:id` | 分類結果の手動修正 |

---

## 8. 外部サービス連携仕様

### 8.1 Gmail API
**必要なスコープ:**
- `gmail.readonly` - メール読取
- `gmail.compose` - 下書き作成
- `gmail.modify` - ラベル操作・履歴取得

**利用する機能:**
- `users.messages.list` / `users.messages.get` - メール取得
- `users.drafts.create` - 下書き作成
- `users.watch` - Push Notification設定
- `users.history.list` - 変更履歴取得（送信検知用）
- `users.messages.get` (SENT) - 送信済みメール内容取得

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
  色: 黄色(banana / colorId: 5)
  説明: MCia自動登録 | 案件ID: xxx

確定予定:
  タイトル: 【確定】○○案件 - △△事務所
  色: 緑(sage / colorId: 2)
  説明: MCia自動登録 | 案件ID: xxx
```

### 8.3 LINE Messaging API
**利用する機能:**
- Push Message - ユーザーへの通知送信

**通知テンプレート:**

| イベント | メッセージ例 |
|---------|------------|
| エントリー下書き作成 | 📩 ○○案件（1/17〜1/20）のエントリー下書きを作成しました。Gmailで確認してください。 |
| エントリー下書き作成(PR付き) | 📩 ○○案件（1/17〜1/20）のエントリー下書きを作成しました。過去の類似実績からPRも作成済みです。Gmailで確認してください。 |
| スケジュール重複(NG) | ⚠️ ○○案件（1/17〜1/20）はスケジュールが重複しています。重複: △△案件（1/18〜1/19） |
| エントリーメール送信検知 | ✅ ○○案件のエントリーメールを送信しました。カレンダーに仮予定を登録しました。 |
| 案件決定 | 🎉 ○○案件が決定しました！以下の案件の辞退下書きを作成しました:・△△案件・□□案件 |
| 辞退メール送信検知 | 📤 △△案件の辞退メールを送信しました。カレンダーから予定を削除しました。 |
| 分類不確実 | ❓ △△事務所からのメール「○○」の内容を判別できませんでした。ダッシュボードで確認してください。 |

### 8.4 Claude Haiku API（メール分類・解析・PR生成）

**モデル:** `claude-haiku-4-5-20251001`（コスト効率を重視）

**用途1: メール分類判定**
- 入力: メール件名 + 本文（先頭2,000文字）
- 出力: `{ category, confidence, reason }`
- 処理時間目安: 200〜500ms

**用途2: 案件情報抽出**
- 入力: 分類済みメール本文
- 出力: 構造化された案件データ（JSON）
- 抽出項目:
  - 案件名/イベント名
  - 日程（開始日・終了日）
  - 場所/会場
  - 報酬/ギャランティ
  - 募集条件
  - 送信元事務所名
  - PR要素の有無・PR記載要件
  - ジャンル（展示会/イベント/司会/受付/ナレーション等）

**用途3: PR文生成**
- 入力: 今回の案件情報 + 過去の類似案件実績リスト（最大5件）
- 出力: 200〜400文字のPR文
- 処理時間目安: 500〜1,000ms

---

## 9. セキュリティ要件

- Google OAuth トークンはサーバーサイドで暗号化して保管（Cloudflare Workers Secrets）
- APIエンドポイントは全て認証必須（JWTベースのセッション管理）
- Webhook エンドポイントは署名検証を実装
  - Gmail: Google Pub/Sub のトークン検証
  - Stripe: Stripe-Signature ヘッダー検証
  - LINE: X-Line-Signature ヘッダー検証
- HTTPS通信のみ（Cloudflare自動SSL）
- 個人情報の取り扱いはプライバシーポリシーに準拠
- D1データベースはWorkerバインディング経由のみアクセス可（外部直接アクセス不可）
- CORS設定: 自ドメインのみ許可

---

## 10. 将来的な拡張計画

### Phase 2
- Outlook / Yahoo Mail 対応
- Apple Calendar / Outlook Calendar 対応
- 案件の自動マッチング・レコメンド機能
- PR文の学習・改善（成功率の高いPRパターン分析）

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
| S4 | ダッシュボード | `/dashboard` | 案件一覧・ステータス概要・分類不確実メール確認 |
| S5 | 案件詳細 | `/projects/:id` | 案件の詳細情報・アクション |
| S6 | カレンダー表示 | `/calendar` | 月間/週間カレンダーで案件表示 |
| S7 | 事務所管理 | `/agencies` | 所属事務所の登録・管理 |
| S8 | 設定 | `/settings` | アカウント・連携・通知設定 |
| S9 | サブスクリプション | `/subscription` | プラン・支払い管理 |

---

## 12. 非機能要件

### 12.1 パフォーマンス
- Webhook応答: 3秒以内（重い処理はQueuesに委譲）
- メール受信〜下書き作成: 30秒以内
- メール送信検知〜カレンダー操作: 10秒以内

### 12.2 可用性
- Cloudflareのグローバルネットワークによる高可用性
- Gmail Push Notificationの失敗時はCron Triggerでポーリングフォールバック

### 12.3 監視
- Cloudflare Workers Analytics でリクエスト監視
- エラー発生時はログ記録 + 管理者通知
