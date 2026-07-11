"use client";

/** Dock inferior (solo mobile) con los 5 tabs del Member OS. */

import { GameDockItem } from "../GameOS";
import { TABS } from "./constants";
import type { MemberOs } from "./useMemberOs";

export default function BottomDock({ os }: { os: MemberOs }) {
  const { tab, setTab, setOsModal } = os;

  return (
    <nav
      className="xg-safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t-[3px] border-white/20 bg-[#0a0a0a]/98 backdrop-blur-md lg:hidden"
      aria-label="Navegación principal"
    >
      {TABS.map((item) => (
        <GameDockItem
          key={item.id}
          label={item.label}
          icon={item.icon}
          active={tab === item.id}
          tourId={`tab-${item.id}`}
          onClick={() => {
            setTab(item.id);
            setOsModal(null);
          }}
        />
      ))}
    </nav>
  );
}
