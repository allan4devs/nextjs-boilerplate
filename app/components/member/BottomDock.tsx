"use client";

/**
 * Dock inferior (solo mobile).
 * Perfil vive en el TopHud (arriba) para no chocar con el atajo de sistemas.
 */

import { GameDockItem } from "../GameOS";
import { TABS } from "./constants";
import type { MemberOs } from "./useMemberOs";

/** Tabs del dock: sin perfil (ese va arriba). */
const DOCK_TABS = TABS.filter((item) => item.id !== "perfil" && item.id !== "maquinas");

export default function BottomDock({ os, showChat = false }: { os: MemberOs; showChat?: boolean }) {
  const { tab, setTab, setOsModal } = os;

  return (
    <nav
      className={`xg-app-dock xg-safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t-[3px] border-white/20 bg-[#0a0a0a]/98 backdrop-blur-md lg:hidden ${showChat ? "pr-[20%]" : ""}`}
      aria-label="Navegación principal"
    >
      {DOCK_TABS.map((item) => (
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
