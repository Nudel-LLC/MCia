import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード" },
  { href: "/calendar", label: "カレンダー" },
  { href: "/agencies", label: "事務所管理" },
  { href: "/invoice-data", label: "請求データ" },
  { href: "/settings", label: "設定" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <button className="text-sm text-muted-foreground hover:text-foreground">
              ログアウト
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-muted">{children}</main>
    </div>
  );
}
