import { AppShell } from "@/components/app-shell";

export default function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
