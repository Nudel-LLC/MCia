# MCia 外部サービスセットアップ指示書

この指示書に従って、MCiaに必要な外部サービスのアカウント作成とAPI キーの取得を行ってください。
全て無料枠で始められます。

---

## 1. Google Cloud プロジェクト（所要時間: 約20分）

Google OAuth、Gmail API、Calendar API、Pub/Sub の全てをここで設定します。

### Step 1: Google Cloud プロジェクトを作成

1. https://console.cloud.google.com にアクセス
2. Googleアカウントでログイン（MCiaの開発用アカウント推奨）
3. 画面上部の「プロジェクトを選択」をクリック
4. 「新しいプロジェクト」をクリック
5. 以下を入力:
   - プロジェクト名: `MCia`
   - 組織: そのまま（個人の場合は「組織なし」）
6. 「作成」をクリック
7. 作成後、そのプロジェクトが選択されていることを確認

### Step 2: 必要なAPIを有効化

1. 左メニューから「APIとサービス」→「ライブラリ」を開く
2. 以下の3つのAPIを検索して、それぞれ「有効にする」をクリック:

| API名 | 検索ワード |
|--------|-----------|
| Gmail API | `Gmail API` |
| Google Calendar API | `Google Calendar API` |
| Cloud Pub/Sub API | `Cloud Pub/Sub` |

※ 各APIのページで「有効にする」ボタンが「管理」に変わればOKです

### Step 3: OAuth 同意画面を設定

1. 左メニューから「APIとサービス」→「OAuth 同意画面」を開く
2. 「使ってみる」または「同意画面を構成」をクリック
3. 以下を入力:

**アプリ情報:**
| 項目 | 入力値 |
|------|--------|
| アプリ名 | `MCia` |
| ユーザーサポートメール | あなたのメールアドレス |
| デベロッパーの連絡先メールアドレス | あなたのメールアドレス |

4. 「保存して次へ」をクリック

**スコープの設定:**
1. 「スコープを追加または削除」をクリック
2. 以下のスコープを検索して追加（チェックを入れる）:

| スコープ | 説明 |
|---------|------|
| `openid` | ユーザー認証 |
| `email` | メールアドレス取得 |
| `profile` | 名前・プロフィール取得 |
| `https://www.googleapis.com/auth/gmail.readonly` | メール読み取り |
| `https://www.googleapis.com/auth/gmail.compose` | メール下書き作成 |
| `https://www.googleapis.com/auth/gmail.modify` | メール変更・履歴取得 |
| `https://www.googleapis.com/auth/calendar.events` | カレンダー予定の読み書き |

3. 「更新」→「保存して次へ」

**テストユーザー:**
1. 「ADD USERS」をクリック
2. あなた自身のGmailアドレスを追加
3. 「保存して次へ」

> **重要:** 最初は「テスト」モードになります。テストユーザーとして追加したアカウントでのみ動作します。本番公開時に「公開」に切り替えますが、開発中はこのままでOKです。

### Step 4: OAuth クライアントIDを作成

1. 左メニューから「APIとサービス」→「認証情報」を開く
2. 上部の「＋認証情報を作成」→「OAuth クライアント ID」をクリック
3. 以下を入力:

| 項目 | 入力値 |
|------|--------|
| アプリケーションの種類 | **ウェブ アプリケーション** |
| 名前 | `MCia Web Client` |
| 承認済みの JavaScript 生成元 | `http://localhost:3000` |
| 承認済みのリダイレクト URI | `http://localhost:3000/api/auth/callback/google` |

4. 「作成」をクリック
5. **表示される「クライアントID」と「クライアントシークレット」をメモしてください**

> これが後で環境変数に設定する `AUTH_GOOGLE_ID` と `AUTH_GOOGLE_SECRET` になります。
> 画面を閉じても「認証情報」ページからいつでも確認できます。

### Step 5: Pub/Sub トピックを作成（Gmail通知受信用）

1. 左メニューから「Pub/Sub」→「トピック」を開く（初回は「APIを有効にする」が表示される場合があります）
2. 「トピックを作成」をクリック
3. 以下を入力:
   - トピック ID: `gmail-notifications`
   - （その他はデフォルトのまま）
4. 「作成」をクリック
5. 作成されたトピックの名前をメモ（`projects/あなたのプロジェクトID/topics/gmail-notifications` の形式）

**Gmailにトピックへの発行権限を付与:**
1. 作成したトピック `gmail-notifications` をクリック
2. 右側の「権限」パネル（または「情報パネルを表示」）を開く
3. 「プリンシパルを追加」をクリック
4. 以下を入力:
   - 新しいプリンシパル: `gmail-api-push@system.gserviceaccount.com`
   - ロール: 「Pub/Sub パブリッシャー」
5. 「保存」をクリック

**Pub/Sub サブスクリプションを作成:**
1. 左メニューから「Pub/Sub」→「サブスクリプション」を開く
2. 「サブスクリプションを作成」をクリック
3. 以下を入力:
   - サブスクリプション ID: `gmail-notifications-push`
   - トピック: 先ほど作成した `gmail-notifications`
   - 配信タイプ: **Push**
   - エンドポイント URL: `https://あなたのドメイン/api/webhooks/gmail`
     （※ 開発中はまだ決まらないので、後で設定変更します。一旦 `https://example.com/api/webhooks/gmail` と入力してください）
4. 「作成」をクリック

> Pub/Subのエンドポイントは、Cloudflare Workersのデプロイ後に実際のURLに更新します。

### Google Cloud で取得したもの（まとめ）

以下をどこかに安全にメモしておいてください:

```
GOOGLE_CLIENT_ID=（Step 4 で取得したクライアントID）
GOOGLE_CLIENT_SECRET=（Step 4 で取得したクライアントシークレット）
GOOGLE_CLOUD_PROJECT_ID=（Step 1 のプロジェクトID）
GOOGLE_PUBSUB_TOPIC=projects/○○/topics/gmail-notifications
```

---

## 2. Cloudflare アカウント（所要時間: 約10分）

### Step 1: Cloudflareアカウントを作成

1. https://dash.cloudflare.com/sign-up にアクセス
2. メールアドレスとパスワードで登録
3. メール認証を完了

### Step 2: Workers の有料プランを有効化（推奨）

> **注意:** 無料プランでも開発は可能ですが、D1・Queues・KVの利用に制限があります。
> Workers Paid プランは **月額$5（約750円）** で、本番運用に必要な全機能が使えます。
> 開発初期は無料プランのままでも大丈夫です。本番デプロイ前に有料化してください。

**無料プランの制限（参考）:**
- Workers: 10万リクエスト/日
- D1: 5GBストレージ、10万行読み取り/日
- KV: 10万読み取り/日
- Queues: 無料プランでは利用不可 → 有料プラン必要

### Step 3: Wrangler CLI をインストール

ターミナル（コマンドプロンプト）で以下を実行:

```bash
npm install -g wrangler
```

インストール後、ログイン:

```bash
wrangler login
```

ブラウザが開くので、Cloudflareアカウントでログインして認証します。

### Step 4: 動作確認

```bash
wrangler whoami
```

アカウント名が表示されればOKです。

### Cloudflare で取得したもの（まとめ）

```
CLOUDFLARE_ACCOUNT_ID=（ダッシュボード右サイドバーに表示されるアカウントID）
```

> D1データベース、KV namespace、Queuesの作成は、プロジェクト構築時にコマンドで自動的に行います。
> ここではアカウント作成とWrangler CLIのセットアップだけでOKです。

---

## 3. Anthropic API キー（所要時間: 約5分）

### Step 1: アカウント作成

1. https://console.anthropic.com にアクセス
2. 「Sign Up」からアカウントを作成
3. メール認証を完了

### Step 2: API キーを作成

1. ログイン後、左メニューから「API Keys」を開く
2. 「Create Key」をクリック
3. 名前: `MCia`
4. 「Create Key」をクリック
5. **表示されるAPIキーをコピーしてメモ（この画面を閉じると二度と表示されません）**

### Step 3: クレジットを追加

1. 左メニューから「Plans & Billing」を開く
2. 支払い方法（クレジットカード）を登録
3. 最低$5のクレジットを追加

> Claude Haikuの料金は非常に安価です（Input: $0.25/100万トークン、Output: $1.25/100万トークン）。
> $5あれば開発・テスト期間中は十分です。

### Anthropic で取得したもの（まとめ）

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxx
```

---

## 4. 全ての取得情報まとめ

最終的に、以下の情報が揃っていれば準備完了です。
プロジェクトのルートに `.dev.vars` というファイルを作成し、以下の形式で保存します:

```
# Google OAuth
AUTH_GOOGLE_ID=あなたのクライアントID
AUTH_GOOGLE_SECRET=あなたのクライアントシークレット

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=あなたのプロジェクトID

# Anthropic
ANTHROPIC_API_KEY=あなたのAPIキー

# Auth.js（以下は任意の文字列を設定 — セッション暗号化用の秘密鍵）
# ターミナルで openssl rand -base64 32 を実行して生成するのがおすすめ
AUTH_SECRET=ランダムな文字列をここに
```

> **重要:** `.dev.vars` は秘密情報を含むファイルです。Gitにコミットしないでください（`.gitignore` に自動で追加されるようにします）。

---

## チェックリスト

全て完了したらチェックしてください:

- [ ] Google Cloud プロジェクト作成済み
- [ ] Gmail API 有効化済み
- [ ] Google Calendar API 有効化済み
- [ ] Cloud Pub/Sub API 有効化済み
- [ ] OAuth 同意画面 設定済み
- [ ] OAuth クライアントID/Secret 取得済み
- [ ] Pub/Sub トピック作成済み
- [ ] Cloudflare アカウント作成済み
- [ ] Wrangler CLI インストール・ログイン済み
- [ ] Anthropic API キー取得済み
- [ ] `.dev.vars` ファイルに全キーを記入済み

**全てチェックがついたら、MCiaの開発環境は準備完了です！**

---

## 困ったときは

| 問題 | 対処 |
|------|------|
| Google Cloud の「APIとサービス」が見つからない | 左上のハンバーガーメニュー（≡）から探してください |
| OAuth同意画面で「センシティブなスコープ」の警告 | 開発中は無視してOK。テストユーザーなら問題なく動きます |
| Wrangler login でブラウザが開かない | `wrangler login --browser=false` を試してください |
| Anthropic API キーをコピーし忘れた | 古いキーを削除して新しいキーを作り直してください |
