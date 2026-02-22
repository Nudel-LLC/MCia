/**
 * Auth.js (NextAuth v5) configuration — Cloudflare Workers + Drizzle ORM
 *
 * 設計方針:
 * ─ `authConfig` はプロバイダ・ページ等の静的設定（ビルド時に安全）
 * ─ `getNextAuth()` はリクエスト時に D1 バインディングを取得して
 *   Drizzle adapter 付きのフルインスタンスを生成する遅延ファクトリ
 * ─ 各 export はこのファクトリ経由で呼び出されるため、
 *   モジュールスコープで Cloudflare コンテキストに触れない
 */

import NextAuth from "next-auth";
import type { NextAuthConfig, NextAuthResult } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import type { NextRequest } from "next/server";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/db/schema";

// ============================================================
// 静的設定（D1 に依存しない部分）
// ============================================================

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

/** ビルド時に評価しても安全な設定部分 */
const authConfig: Omit<NextAuthConfig, "adapter"> = {
  providers: [
    Google({
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  pages: { signIn: "/login" },
};

// ============================================================
// リクエスト時ファクトリ
// ============================================================

async function getNextAuth(): Promise<NextAuthResult> {
  const { env } = await getCloudflareContext({ async: true });
  const cfEnv = env as unknown as CloudflareEnv;
  const db = drizzle(cfEnv.DB);

  return NextAuth({
    ...authConfig,
    adapter: DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    providers: [
      Google({
        clientId: cfEnv.AUTH_GOOGLE_ID,
        clientSecret: cfEnv.AUTH_GOOGLE_SECRET,
        authorization: {
          params: {
            scope: GOOGLE_SCOPES,
            access_type: "offline",
            prompt: "consent",
          },
        },
      }),
    ],
  });
}

// ============================================================
// Public API — ルートハンドラー / Server Components から利用
// ============================================================

export async function auth() {
  const { auth: fn } = await getNextAuth();
  return fn();
}

export async function signIn(
  ...args: Parameters<NextAuthResult["signIn"]>
) {
  const { signIn: fn } = await getNextAuth();
  return fn(...args);
}

export async function signOut(
  ...args: Parameters<NextAuthResult["signOut"]>
) {
  const { signOut: fn } = await getNextAuth();
  return fn(...args);
}

export async function handleAuthGET(request: NextRequest) {
  const { handlers } = await getNextAuth();
  return handlers.GET(request);
}

export async function handleAuthPOST(request: NextRequest) {
  const { handlers } = await getNextAuth();
  return handlers.POST(request);
}
