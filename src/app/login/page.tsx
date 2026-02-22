"use client";

import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-primary">
            MCia
          </Link>
          <p className="text-muted-foreground mt-2">
            MC・コンパニオン エントリー業務自動化
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
          <h2 className="text-xl font-semibold text-center mb-6">ログイン</h2>

          <button
            onClick={() => {
              // TODO: Auth.js signIn("google") を呼び出し
              window.location.href = "/api/auth/signin?callbackUrl=/dashboard";
            }}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-medium">Googleアカウントでログイン</span>
          </button>

          <p className="text-xs text-muted-foreground text-center mt-6">
            ログインすることで、Gmail・Googleカレンダーへの
            <br />
            アクセスを許可いただきます。
          </p>
        </div>
      </div>
    </div>
  );
}
