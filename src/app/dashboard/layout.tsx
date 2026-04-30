import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { auth } from "@/lib/auth";
import { getDbAsync } from "@/lib/db";
import { agencies } from "@/db/schema";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  // 初回ログイン直後 (事務所未登録) はセットアップへ誘導
  const db = await getDbAsync();
  const [agency] = await db
    .select({ id: agencies.id })
    .from(agencies)
    .where(eq(agencies.userId, session.user.id))
    .limit(1);
  if (!agency) {
    redirect("/setup");
  }

  return <AppShell>{children}</AppShell>;
}
