import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCia - MC/コンパニオン エントリー業務自動化",
  description:
    "MC・コンパニオンの案件エントリー・スケジュール管理・辞退連絡を自動化するアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
