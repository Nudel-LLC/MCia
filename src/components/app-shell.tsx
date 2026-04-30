"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

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
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  function handleLogout() {
    signOut({ callbackUrl: "/login" });
  }

  const userName = session?.user?.name ?? session?.user?.email ?? "";
  const userImage = session?.user?.image ?? null;
  const initial = userName ? userName.charAt(0).toUpperCase() : "?";

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
          <div className="flex items-center gap-3" ref={menuRef}>
            {status === "loading" ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : session?.user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 hover:bg-muted rounded-full p-1 pr-3 transition-colors"
                  aria-label="アカウントメニュー"
                  aria-expanded={menuOpen}
                >
                  {userImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={userImage}
                      alt={userName}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                      {initial}
                    </div>
                  )}
                  <span className="text-sm hidden sm:inline max-w-[10rem] truncate">
                    {userName}
                  </span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-border rounded-lg shadow-lg overflow-hidden z-10">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium truncate">{userName}</p>
                      {session.user.email && session.user.email !== userName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {session.user.email}
                        </p>
                      )}
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm hover:bg-muted"
                    >
                      設定
                    </Link>
                    <Link
                      href="/subscription"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm hover:bg-muted"
                    >
                      契約情報
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted border-t border-border"
                    >
                      ログアウト
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ログイン
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 bg-muted">{children}</main>
    </div>
  );
}
