import { AppShell } from "@/components/app-shell";

export default function InvoiceDataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
