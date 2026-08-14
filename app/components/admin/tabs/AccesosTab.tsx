"use client";

import Link from "next/link";
import {
  DoorOpen,
} from "lucide-react";
import {
  STATUS_STYLES,
  STATUS_LABEL,
} from "../constants";
import type { AdminData, AdminMember } from "../types";

export type AccesosTabProps = {
  data: AdminData;
};

export function AccesosTab({ data }: AccesosTabProps) {
  return (
    <div className="border border-white/10 bg-white/[0.04]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <DoorOpen className="h-5 w-5 text-cyan-300" />
          <h2 className="text-lg font-black uppercase">
            Ingresos de hoy ({data.checkins.length})
          </h2>
        </div>
        <Link href="/recepcion" className="text-xs font-black uppercase text-cyan-300 hover:underline">
          Reception OS →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wide text-white/40">
              <th className="px-5 py-3">Hora</th>
              <th className="px-3 py-3">Socio</th>
              <th className="px-3 py-3">Codigo</th>
              <th className="px-3 py-3">Metodo</th>
              <th className="px-3 py-3">Membresia</th>
              <th className="px-3 py-3">Via</th>
            </tr>
          </thead>
          <tbody>
            {data.checkins.map((c) => (
              <tr key={c.id} className="border-b border-white/[0.06]">
                <td className="px-5 py-3 font-mono text-xs text-white/60">
                  {new Date(c.checkedInAt).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-3 py-3 font-black uppercase">{c.memberName}</td>
                <td className="px-3 py-3 font-mono text-xs tracking-wider text-cyan-200">{c.accessCode}</td>
                <td className="px-3 py-3 text-white/60">{c.method}</td>
                <td className="px-3 py-3">
                  <span
                    className={`border px-2 py-0.5 text-[10px] font-black uppercase ${
                      STATUS_STYLES[(c.membershipStatus as AdminMember["membershipStatus"]) || "active"] ||
                      STATUS_STYLES.active
                    }`}
                  >
                    {STATUS_LABEL[(c.membershipStatus as AdminMember["membershipStatus"]) || "active"] ||
                      c.membershipStatus}
                  </span>
                </td>
                <td className="px-3 py-3 text-white/50">{c.by}</td>
              </tr>
            ))}
            {!data.checkins.length && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm font-semibold text-white/45">
                  Nadie ha ingresado hoy. Usa Reception OS (/recepcion) o el boton de puerta en socios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
