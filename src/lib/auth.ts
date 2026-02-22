import NextAuth from "next-auth";
import type { NextAuthResult } from "next-auth";
import Google from "next-auth/providers/google";
import { D1Adapter } from "@auth/d1-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextRequest } from "next/server";

// Google OAuth scopes for Gmail + Calendar access
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

// Lazy initialization — creates a NextAuth instance using the current request's Cloudflare context.
// Must NOT be called at module scope (only within request handlers).
async function getNextAuth(): Promise<NextAuthResult> {
  const { env } = await getCloudflareContext({ async: true });
  const cfEnv = env as unknown as CloudflareEnv;

  return NextAuth({
    adapter: D1Adapter(cfEnv.DB),
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
    session: {
      strategy: "database",
    },
    callbacks: {
      async session({ session, user }) {
        session.user.id = user.id;
        return session;
      },
    },
    pages: {
      signIn: "/login",
    },
  });
}

// Lazy auth — get the current session (used in API routes and server components)
export async function auth() {
  const { auth: authFn } = await getNextAuth();
  return authFn();
}

// Lazy signIn
export async function signIn(
  ...args: Parameters<NextAuthResult["signIn"]>
) {
  const { signIn: signInFn } = await getNextAuth();
  return signInFn(...args);
}

// Lazy signOut
export async function signOut(
  ...args: Parameters<NextAuthResult["signOut"]>
) {
  const { signOut: signOutFn } = await getNextAuth();
  return signOutFn(...args);
}

// Auth route handlers for /api/auth/[...nextauth]
export async function handleAuthGET(request: NextRequest) {
  const { handlers } = await getNextAuth();
  return handlers.GET(request);
}

export async function handleAuthPOST(request: NextRequest) {
  const { handlers } = await getNextAuth();
  return handlers.POST(request);
}
