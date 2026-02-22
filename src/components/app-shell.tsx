"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード" },
  { href: "/projects", label: "案件一覧" },
  { href: "/calendar", label: "カレンダー" },
  { href: "/agencies", label: "事務所管理" },
  { href: "/invoice-data", label: "請求データ" },
  { href: "/settings", label: "設定" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  function handleLogout() {
    window.location.href = "/api/auth/signout?callbackUrl=/login";
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-primary">
            MCia
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors ${
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href))
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-muted">{children}</main>
    </div>
  );
}
