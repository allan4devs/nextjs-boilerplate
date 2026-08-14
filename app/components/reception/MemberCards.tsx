"use client";

/**
 * Tarjetas de socio compartidas por el mostrador: las usan tanto la búsqueda
 * por nombre como el ingreso por rostro, para que la persona vea exactamente
 * la misma ficha antes de confirmar sin importar cómo la encontró recepción.
 */
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { GameButton, GameCallout, GameChip, GameLabel } from "../GameOS";
import { MEMBERSHIP_STATUS_LABELS } from "@/app/features/checkin/constants";
import type { MemberHit } from "@/lib/xtreme/checkin/contracts";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Avatar({
  name,
  photoUrl,
  large,
}: {
  name: string;
  photoUrl?: string;
  large?: boolean;
}) {
  const size = large ? "h-14 w-14" : "h-10 w-10";
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className={`${size} shrink-0 object-cover ${large ? "" : "rounded-none"}`}
      />
    );
  }
  return (
    <span
      className={`grid ${size} shrink-0 place-items-center bg-[#d8ff3e]/15 text-xs font-black text-[#d8ff3e]`}
    >
      {initials(name)}
    </span>
  );
}

export function MemberPreview({
  member,
  error,
  isCheckingIn,
  onConfirm,
  eyebrow = "Socio encontrado · confirmar",
  badge,
}: {
  member: MemberHit | null;
  error: string;
  isCheckingIn: boolean;
  onConfirm: () => void;
  eyebrow?: string;
  /** Detalle extra del método de identificación (ej. el porcentaje del rostro). */
  badge?: React.ReactNode;
}) {
  if (!member && !error) return null;

  if (!member) {
    return (
      <div className="mt-4">
        <GameCallout tone="red" icon={XCircle}>
          {error}
        </GameCallout>
      </div>
    );
  }

  const expired = member.membershipStatus === "expired";

  return (
    <div className="mt-5 border-[3px] border-[#d8ff3e]/55 bg-black/50 p-4 shadow-[4px_4px_0_rgba(216,255,62,0.2)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <GameLabel tone="lime">{eyebrow}</GameLabel>
        {badge}
      </div>

      <section className={`border-[3px] p-4 ${expired ? "border-orange-300/60 bg-orange-400/10" : member.membershipStatus === "warning" ? "border-yellow-300/55 bg-yellow-300/[0.07]" : "border-[#d8ff3e]/55 bg-[#d8ff3e]/[0.07]"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/40">Membresía</p>
            <p className="mt-1 text-2xl font-black uppercase">{member.plan || "Sin plan"}</p>
          </div>
          <GameChip tone={expired ? "red" : member.membershipStatus === "warning" ? "orange" : "lime"}>{MEMBERSHIP_STATUS_LABELS[member.membershipStatus]}</GameChip>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
          <div><p className="text-[9px] font-black uppercase tracking-wide text-white/35">Tiempo restante</p><p className={`mt-1 text-lg font-black ${expired ? "text-orange-200" : "text-[#d8ff3e]"}`}>{expired ? "Vencida" : `${Math.max(0, member.daysRemaining)} días`}</p></div>
          <div><p className="text-[9px] font-black uppercase tracking-wide text-white/35">Próximo vencimiento</p><p className="mt-1 text-sm font-black">{member.nextBillingDate || "Sin fecha registrada"}</p></div>
        </div>
        {expired && <p className="mt-3 border-t border-orange-300/25 pt-3 text-sm font-black text-orange-200">Membresía vencida · podés registrar el ingreso y gestionar la renovación.</p>}
      </section>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative">
          {member.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.photoUrl}
              alt={member.memberName}
              className="h-16 w-16 border-[3px] border-[#d8ff3e]/50 object-cover"
            />
          ) : (
            <span className="grid h-16 w-16 place-items-center border-[3px] border-black/30 bg-[#d8ff3e] text-xl font-black text-black">
              {initials(member.memberName)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black uppercase tracking-tight">{member.memberName}</p>
          <p className="mt-1 text-xs font-bold text-white/35">
            {member.cedula ? `Ced. ${member.cedula} · ` : ""}
            {member.accessCode}
          </p>
          {member.phone && <p className="mt-1 text-xs font-bold text-white/35">{member.phone}</p>}
        </div>
      </div>

      {error && (
        <div className="mt-3">
          <GameCallout tone="red" icon={XCircle}>
            {error}
          </GameCallout>
        </div>
      )}

      <GameButton full className="mt-4 !min-h-14 !text-base" disabled={isCheckingIn} onClick={onConfirm}>
        {isCheckingIn ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-5 w-5" />
        )}
        Confirmar ingreso
      </GameButton>
    </div>
  );
}
