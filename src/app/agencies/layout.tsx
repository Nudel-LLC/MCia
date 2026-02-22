import { AppShell } from "@/components/app-shell";

export default function AgenciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
