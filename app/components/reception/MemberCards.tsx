"use client";

/**
 * Tarjetas de socio compartidas por el mostrador: las usan tanto la búsqueda
 * por nombre como el ingreso por rostro, para que la persona vea exactamente
 * la misma ficha antes de confirmar sin importar cómo la encontró recepción.
 */
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { GameButton, GameCallout, GameChip, GameLabel, type GameChipProps } from "../GameOS";
import { MEMBERSHIP_STATUS_LABELS } from "@/app/features/checkin/constants";
import type { MemberHit, MembershipStatus } from "@/lib/xtreme/checkin/contracts";

/**
 * Cómo se ve cada estado de membresía, en un solo lugar. Al ser un Record del
 * tipo, agregar un estado nuevo no compila hasta decidir de qué color va: antes
 * la regla vivía repartida en tres ternarios anidados que podían discrepar.
 */
const STATUS_STYLES: Record<
  MembershipStatus,
  { panel: string; chip: GameChipProps["tone"]; remaining: string }
> = {
  active: {
    panel: "border-[#d8ff3e]/55 bg-[#d8ff3e]/[0.07]",
    chip: "lime",
    remaining: "text-[#d8ff3e]",
  },
  warning: {
    panel: "border-yellow-300/55 bg-yellow-300/[0.07]",
    chip: "orange",
    remaining: "text-[#d8ff3e]",
  },
  expired: {
    panel: "border-orange-300/60 bg-orange-400/10",
    chip: "red",
    remaining: "text-orange-200",
  },
};

const AVATAR_SIZES = {
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-xs",
  xl: "h-16 w-16 text-xl",
} as const;

/** `tinted` para listas, `solid` para la ficha que recepción confirma. */
const AVATAR_TONES = {
  tinted: { photo: "", initials: "bg-[#d8ff3e]/15 font-black text-[#d8ff3e]" },
  solid: {
    photo: "border-[3px] border-[#d8ff3e]/50",
    initials: "border-[3px] border-black/30 bg-[#d8ff3e] font-black text-black",
  },
} as const;

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Avatar({
  name,
  photoUrl,
  size = "md",
  tone = "tinted",
}: {
  name: string;
  photoUrl?: string;
  size?: keyof typeof AVATAR_SIZES;
  tone?: keyof typeof AVATAR_TONES;
}) {
  const box = `${AVATAR_SIZES[size]} shrink-0`;
  const styles = AVATAR_TONES[tone];

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt={name} className={`${box} ${styles.photo} object-cover`} />
    );
  }
  return (
    <span className={`grid ${box} place-items-center ${styles.initials}`}>{initials(name)}</span>
  );
}

/** Par etiqueta + dato de la franja de membresía. */
function MembershipStat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName: string;
}) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-wide text-white/35">{label}</p>
      <p className={`mt-1 font-black ${valueClassName}`}>{value}</p>
    </div>
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

  const status = STATUS_STYLES[member.membershipStatus];
  const expired = member.membershipStatus === "expired";

  return (
    <div className="mt-5 border-[3px] border-[#d8ff3e]/55 bg-black/50 p-4 shadow-[4px_4px_0_rgba(216,255,62,0.2)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <GameLabel tone="lime">{eyebrow}</GameLabel>
        {badge}
      </div>

      <section className={`border-[3px] p-4 ${status.panel}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/40">
              Membresía
            </p>
            <p className="mt-1 text-2xl font-black uppercase">{member.plan || "Sin plan"}</p>
          </div>
          <GameChip tone={status.chip}>
            {MEMBERSHIP_STATUS_LABELS[member.membershipStatus]}
          </GameChip>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
          <MembershipStat
            label="Tiempo restante"
            value={expired ? "Vencida" : `${Math.max(0, member.daysRemaining)} días`}
            valueClassName={`text-lg ${status.remaining}`}
          />
          <MembershipStat
            label="Próximo vencimiento"
            value={member.nextBillingDate || "Sin fecha registrada"}
            valueClassName="text-sm"
          />
        </div>

        {expired && (
          <p className="mt-3 border-t border-orange-300/25 pt-3 text-sm font-black text-orange-200">
            Membresía vencida · podés registrar el ingreso y gestionar la renovación.
          </p>
        )}
      </section>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative">
          <Avatar
            name={member.memberName}
            photoUrl={member.photoUrl}
            size="xl"
            tone="solid"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black uppercase tracking-tight">
            {member.memberName}
          </p>
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

      <GameButton
        full
        className="mt-4 !min-h-14 !text-base"
        disabled={isCheckingIn}
        onClick={onConfirm}
      >
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
