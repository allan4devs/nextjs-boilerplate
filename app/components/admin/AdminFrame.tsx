import type { ReactNode } from "react";
import { AdminShell } from "./AdminShell";
import { AdminProvider } from "./context/AdminProvider";

export function AdminFrame({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
