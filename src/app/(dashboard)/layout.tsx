import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/providers/toast-provider";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}
