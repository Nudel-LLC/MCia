import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { D1Adapter } from "@auth/d1-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";

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

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const { env } = getCloudflareContext();
  const cfEnv = env as unknown as CloudflareEnv;

  return {
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
  };
});
