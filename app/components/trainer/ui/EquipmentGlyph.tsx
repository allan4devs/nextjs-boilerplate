import type { EquipmentGlyphKind } from "@/lib/xtreme/trainer-equipment-search";

/** Pictogramas Xtreme: estructura cian, asiento/carga lima y base de sala común. */
export function EquipmentGlyph({ kind, className = "h-14 w-14" }: { kind: EquipmentGlyphKind; className?: string }) {
  const frames: Record<EquipmentGlyphKind, string> = {
    treadmill: "M9 49h39l7-5H18L9 49Zm32-5-5-29h12m-13 0-4 6m-5 0h14",
    bike: "M17 44 29 28l13 16H17Zm12-16 5-11h11m-6 0 4 7m-14 4-8-8m-6 0h13M29 44l7 6",
    elliptical: "M13 47h15l9-16-5-19m16 35H33l-9-16 5-19M13 47l-4 7m39-7 7 7M18 31h25",
    stairs: "M8 53h13V42h11V31h11V20h10M21 42l-4-25h32M17 17l-6 8",
    "leg-press": "M9 53h45M16 51l19-32m-9 31 20-31M34 14l17 9M13 35l13 7m-12-7-4-12m18 19 4 9",
    "leg-extension": "M9 54h47M15 52V27m0-15v15h20m0 0 6 17m0 0h13m-7-4v9M19 28h15",
    "leg-curl": "M9 54h47M14 52V25m0-13v13h21m0 0 5 13m0 0-13 7m-3-4 5 9M18 27h16",
    hip: "M9 54h47M18 51V30m0-17v17h28m-14 0-8 15m8-15 14 15M21 46h7m15 0h7",
    press: "M10 54h44M19 52V31m0-17v17h18m-7 1v20M19 15l-6-7m6 7 22 1m0 0 7-8m-7 8v16M11 9h8m25 0h8",
    pulldown: "M9 54h47M47 53V9H17v12m-8 0h17m7 18H17m0 0v14m16-14v14M42 19h10m-10 7h10m-10 7h10",
    cable: "M8 54h48M13 52V10h38v42M18 15h8v30h-8V15Zm20 0h8v30h-8V15ZM26 18l6 17 6-17m-8 17h5",
    rack: "M9 54h46M15 52V10h34v42M15 19h34M10 27h44M11 22v10m42-10v10M24 19v6m16-6v6",
    bench: "M8 53h48M16 51l5-17m23 17-6-17M12 30h34m-34 0-3-13m11 17h24",
    dumbbell: "M15 20v24m6-28v32m22-32v32m6-28v24M21 32h22M9 26v12m46-12v12",
  };
  const pads: Partial<Record<EquipmentGlyphKind, string>> = {
    treadmill: "M17 45h28", bike: "M16 20h12", elliptical: "M12 47h13m11 0h13",
    stairs: "M11 52h9m2-11h9m2-11h9", "leg-press": "M12 35l13 7m12-26 11 6",
    "leg-extension": "M16 26h17m-18-3V13", "leg-curl": "M16 26h17m-18-3V13",
    hip: "M19 29h24m-25-4V14", press: "M20 31h15m-16-5V16",
    pulldown: "M17 38h16m-22-17h13", cable: "M19 37h6m14 0h6", rack: "M21 27h22", bench: "M13 30h31", dumbbell: "M21 32h22",
  };
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d={frames[kind]} className="text-cyan-300" />
    {kind === "bike" && <><circle cx="17" cy="44" r="9" className="text-cyan-300" /><circle cx="43" cy="44" r="9" className="text-cyan-300" /></>}
    {pads[kind] && <path d={pads[kind]} strokeWidth="4" className="text-[#d8ff3e]" />}
  </svg>;
}
