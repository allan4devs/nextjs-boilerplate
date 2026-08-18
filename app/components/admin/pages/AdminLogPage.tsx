"use client";

import { useState } from "react";
import { useAdmin } from "../context/AdminProvider";
import { BitacoraTab } from "../tabs/BitacoraTab";

export function AdminLogPage() {
  const { data } = useAdmin().data;
  const [usageSessionId, setUsageSessionId] = useState<string | null>(null);

  return data ? (
    <BitacoraTab
      data={data}
      usageSessionId={usageSessionId}
      onSelectSession={setUsageSessionId}
      onToggleSession={(id) => setUsageSessionId((current) => (current === id ? null : id))}
    />
  ) : null;
}
