import { NextResponse, type NextRequest } from "next/server";

/**
 * 認証が必要なページのプレフィックス。
 * 該当パスへの未ログインアクセスは /login にリダイレクトする。
 *
 * セッション検証は各ルートハンドラー / Server Component の `auth()` で
 * 厳格に行うので、ここではクッキー存在チェックのみ。Cloudflare Workers の
 * Edge ランタイムから D1 を引かずに済むよう敢えて軽量に保っている。
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/projects",
  "/calendar",
  "/agencies",
  "/invoice-data",
  "/settings",
  "/subscription",
  "/setup",
];

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!isProtected) return NextResponse.next();

  const hasSession = SESSION_COOKIE_NAMES.some(
    (name) => request.cookies.get(name)?.value
  );
  if (hasSession) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * 静的アセット・画像最適化・Auth.js ルート自体は除外。
     * 認証チェックを通したいページのみを評価対象にする。
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
