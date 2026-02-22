# Auth.js v5 + D1 Adapter + Cloudflare Workers セットアップ指示書

## 概要

本ドキュメントは、Auth.js v5 を Google OAuth + Cloudflare D1 Adapter で動作させるための調査結果と実装指針をまとめたものです。

---

## 1. auth.ts の構成 (D1 + Cloudflare Workers)

Cloudflare Workers では、環境バインディング(D1を含む)はモジュールスコープではアクセスできず、リクエストコンテキスト内でのみ取得可能です。解決策は **async ラッパーパターン** です。

### 推奨パターン

```ts
// src/lib/auth.ts
import NextAuth from "next-auth";
import { NextAuthResult } from "next-auth";
import { D1Adapter } from "@auth/d1-adapter";
import Google from "next-auth/providers/google";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const authResult = async (): Promise<NextAuthResult> => {
    const { env } = await getCloudflareContext();
    return NextAuth({
        providers: [
            Google({
                clientId: env.AUTH_GOOGLE_ID,
                clientSecret: env.AUTH_GOOGLE_SECRET,
                authorization: {
                    params: {
                        scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar.events",
                        access_type: "offline",
                        prompt: "consent",
                    },
                },
            }),
        ],
        adapter: D1Adapter(env.DB),
        session: { strategy: "database" },
        callbacks: {
            async session({ session, user }) {
                session.user.id = user.id;
                return session;
            },
        },
    });
};

export const { handlers, signIn, signOut, auth } = await authResult();
```

### ルートハンドラー

```ts
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

### 重要ポイント

- `getCloudflareContext()` は `@opennextjs/cloudflare` から取得
- `tsconfig.json` の target は `es2022` 以上が必要 (トップレベル await 対応)
- SSGルートでは `getCloudflareContext({ async: true })` が必要な場合あり

---

## 2. D1 バインディングの取得方法

```ts
const { env } = await getCloudflareContext();
// env.DB が D1Database バインディング
D1Adapter(env.DB);
```

### wrangler.jsonc での設定

```jsonc
{
    "d1_databases": [{
        "binding": "DB",
        "database_name": "mcia-db",
        "database_id": "your-database-id-here"
    }]
}
```

### TypeScript 型定義 (cloudflare-env.d.ts)

```ts
interface CloudflareEnv {
    AUTH_SECRET: string;
    AUTH_GOOGLE_ID: string;
    AUTH_GOOGLE_SECRET: string;
    DB: D1Database;
    KV: KVNamespace;
    ASSETS: Fetcher;
}
```

### ローカル開発設定

`next.config.ts` で `initOpenNextCloudflareForDev()` を呼び出す必要がある:

```ts
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
```

これがないと `getCloudflareContext()` が以下のエラーをスロー:
> "getCloudflareContext has been called without having called initOpenNextCloudflareForDev from the Next.js config file."

秘密の環境変数はローカル開発用に `.dev.vars` に記載 (バージョン管理対象外):

```
AUTH_SECRET=your-random-secret
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```

---

## 3. Split Config パターン (Edge互換性)

アダプターがEdge非互換の場合の公式推奨パターン。設定を2ファイルに分割:

### auth.config.ts (Edge互換・軽量 / ミドルウェア用)

```ts
// src/lib/auth.config.ts
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

export default {
    providers: [Google],
} satisfies NextAuthConfig;
```

### auth.ts (フルコンフィグ / サーバーサイド用)

```ts
// src/lib/auth.ts
import NextAuth from "next-auth";
import { D1Adapter } from "@auth/d1-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import authConfig from "./auth.config";

const authResult = async () => {
    const { env } = await getCloudflareContext();
    return NextAuth({
        adapter: D1Adapter(env.DB),
        session: { strategy: "database" },
        ...authConfig,
    });
};

export const { handlers, auth, signIn, signOut } = await authResult();
```

### ミドルウェア

```ts
// src/middleware.ts
export { auth as middleware } from "@/lib/auth";
```

### 分割が必要な理由

- ミドルウェアはEdgeで動作し、TCPソケットやNode.js固有APIが使えない
- DBアダプターはEdgeで利用不可能な機能に依存
- 軽量コンフィグでミドルウェアがJWT/Cookieベースの楽観的セッションチェックを実行
- フルコンフィグはルートハンドラーやサーバーコンポーネントで使用

### セキュリティ上の注意

ミドルウェアはセキュリティ境界ではない。リダイレクトによるUX向上のみ。
サーバーコンポーネントとルートハンドラーで必ずセッションを再検証すること。

---

## 4. @auth/d1-adapter が必要とするDBスキーマ

### 自動マイグレーション (up() 関数)

```ts
// src/app/api/setup/route.ts
import type { NextRequest } from "next/server";
import { up } from "@auth/d1-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: NextRequest) {
    try {
        await up((await getCloudflareContext()).env.DB);
    } catch (e: any) {
        console.log(e.cause.message, e.message);
    }
    return new Response("Migration completed");
}
```

### 手動SQL スキーマ

```sql
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" text NOT NULL,
    "userId" text NOT NULL DEFAULT NULL,
    "type" text NOT NULL DEFAULT NULL,
    "provider" text NOT NULL DEFAULT NULL,
    "providerAccountId" text NOT NULL DEFAULT NULL,
    "refresh_token" text DEFAULT NULL,
    "access_token" text DEFAULT NULL,
    "expires_at" number DEFAULT NULL,
    "token_type" text DEFAULT NULL,
    "scope" text DEFAULT NULL,
    "id_token" text DEFAULT NULL,
    "session_state" text DEFAULT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "sessions" (
    "id" text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL DEFAULT NULL,
    "expires" datetime NOT NULL DEFAULT NULL,
    PRIMARY KEY (sessionToken)
);

CREATE TABLE IF NOT EXISTS "users" (
    "id" text NOT NULL DEFAULT '',
    "name" text DEFAULT NULL,
    "email" text DEFAULT NULL,
    "emailVerified" datetime DEFAULT NULL,
    "image" text DEFAULT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "verification_tokens" (
    "identifier" text NOT NULL,
    "token" text NOT NULL DEFAULT NULL,
    "expires" datetime NOT NULL DEFAULT NULL,
    PRIMARY KEY (token)
);
```

**注意:** MCiaのスキーマ (`src/db/schema.sql`) では users テーブルと accounts テーブルに追加カラムがあるため、Auth.js の基本テーブルとMCiaの拡張カラムを統合する必要がある。

---

## 5. パッケージバージョン (参考実装)

```json
{
    "next-auth": "^5.0.0-beta.25",
    "@auth/d1-adapter": "^1.7.3",
    "@opennextjs/cloudflare": "^0.2.1",
    "next": "14.2.26"
}
```

**注意:** MCiaプロジェクトでは以下を使用中:
- `next`: 16.1.6
- `@opennextjs/cloudflare`: 1.16.5
- `next-auth`: 5.0.0-beta.25 (要確認)

---

## 6. Google OAuth 環境変数

Auth.js v5 は `AUTH_` プレフィックスによる自動環境変数推論をサポート:

| 変数名 | 用途 |
|--------|------|
| `AUTH_GOOGLE_ID` | Google OAuth クライアントID |
| `AUTH_GOOGLE_SECRET` | Google OAuth クライアントシークレット |
| `AUTH_SECRET` | 本番環境でのトークン署名用シークレット |

自動推論を使う場合、プロバイダー設定は `Google` (引数なし) に簡略化可能。
ただし、MCiaではカスタムスコープが必要なため引数付きで設定する。

---

## 7. 既知の問題

1. **Auth.js + D1 が一部構成で動作しない問題**
   - [opennextjs/opennextjs-cloudflare#435](https://github.com/opennextjs/opennextjs-cloudflare/issues/435)
   - 回避策: 上記の async ラッパーパターンを使用

2. **D1 アダプタードキュメントの不具合**
   - [nextauthjs/next-auth#12044](https://github.com/nextauthjs/next-auth/issues/12044)
   - モジュールスコープで `env.db` を参照していた問題 (修正済み)

3. **CVE-2025-29927: Next.js ミドルウェアバイパス脆弱性**
   - Next.js >= 15.2.3 以降で修正
   - `x-middleware-subrequest` ヘッダーをEdge/プロキシでブロックすること推奨

---

## 8. MCia での実装方針

### 現在の auth.ts の状態

既に async ラッパーパターンで実装済み。以下の点を確認・調整が必要:

1. **tsconfig.json の target** を `ES2022` 以上に変更 (現在 `ES2017`)
2. **D1 Adapter のスキーマ** と MCia のカスタムスキーマの統合
3. **Split Config パターン** の適用検討 (ミドルウェアを使用する場合)
4. **ローカル開発環境** での `.dev.vars` 設定

### 実装優先順位

1. tsconfig.json の target 修正
2. auth.ts の動作確認・必要に応じた修正
3. DBマイグレーションルートの追加 (`/api/setup`)
4. ミドルウェアの設定

---

## 参考リンク

- [Auth.js D1 Adapter Documentation](https://authjs.dev/getting-started/adapters/d1)
- [Auth.js Edge Compatibility Guide](https://authjs.dev/guides/edge-compatibility)
- [Auth.js Google Provider](https://authjs.dev/getting-started/providers/google)
- [Auth.js v5 Migration Guide](https://authjs.dev/getting-started/migrating-to-v5)
- [D1 Adapter migrations.ts Source](https://github.com/nextauthjs/next-auth/blob/main/packages/adapter-d1/src/migrations.ts)
- [mackenly/auth-js-d1-example (参考実装)](https://github.com/mackenly/auth-js-d1-example)
- [OpenNext Cloudflare Bindings](https://opennext.js.org/cloudflare/bindings)
