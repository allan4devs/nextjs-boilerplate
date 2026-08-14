"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Flame,
  Loader2,
  ScanFace,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import {
  MEMBERSHIP_STATUS_LABELS,
} from "@/app/features/checkin/constants";
import {
  initialsOf,
} from "@/app/lib/memberName";
import type {
  MemberHit,
} from "@/lib/xtreme/checkin/contracts";

export function ProfileCard({
  profile,
  isCheckingIn,
  error,
  method,
  pin,
  onPinChange,
  onContinue,
  onSwitch,
}: {
  profile: MemberHit;
  isCheckingIn: boolean;
  error: string;
  method: string;
  pin: string;
  onPinChange: (value: string) => void;
  onContinue: () => void;
  onSwitch: () => void;
}) {
  const expired = profile.membershipStatus === "expired";
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative grid h-36 w-36 place-items-center overflow-visible rounded-full bg-[#0b0b0b] text-[#d8ff3e] shadow-lg ring-4 ring-[#d8ff3e]/30">
        {profile.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.photoUrl}
            alt={profile.memberName}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span className="text-5xl font-black">{initialsOf(profile.memberName)}</span>
        )}
        {profile.streak > 0 && (
          <span className="absolute -bottom-1 -right-1 inline-flex items-center gap-1 rounded-full bg-[#d8ff3e] px-2.5 py-1 text-xs font-black text-black">
            <Flame className="h-3.5 w-3.5" /> {profile.streak}
          </span>
        )}
      </div>

      <h2 className="mt-6 text-2xl font-black uppercase tracking-tight">{profile.memberName}</h2>
      <p className="mt-1 text-sm font-bold text-black/45">
        {MEMBERSHIP_STATUS_LABELS[profile.membershipStatus]}
        {profile.daysRemaining >= 0 ? ` · ${profile.daysRemaining} dias` : " · vencida"} · {profile.plan}
      </p>
      {method === "face" && (
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-[#6f9800]">
          <ScanFace className="h-3.5 w-3.5" /> Detectado por rostro
          {profile.faceDistance != null ? ` · dist ${profile.faceDistance}` : ""}
        </p>
      )}

      {expired && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-left text-sm font-bold text-orange-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Membresia vencida. Podes ingresar, pero pasa por recepcion.
        </div>
      )}

      <label className="mt-5 w-full text-left">
        <span className="mb-1 block text-xs font-black uppercase tracking-wide text-black/45">
          PIN de 4 digitos
        </span>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          value={pin}
          onChange={(e) => onPinChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="••••"
          className="w-full rounded-xl border-2 border-black/15 bg-white px-4 py-3 text-center text-2xl font-black tracking-[0.4em] text-black outline-none focus:border-[#8fbf00]"
        />
        {profile.hasPin === false && (
          <span className="mt-1 block text-xs font-bold text-orange-700">
            Sin PIN: configuralo en la app o pedí ayuda en recepción.
          </span>
        )}
      </label>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onContinue}
        disabled={isCheckingIn || pin.length !== 4}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0b0b0b] px-6 py-4 text-base font-black uppercase tracking-wide text-[#d8ff3e] transition hover:bg-[#1a1a1a] disabled:opacity-50"
      >
        {isCheckingIn ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-5 w-5" />
        )}
        Confirmar ingreso
      </button>

      <button
        type="button"
        onClick={onSwitch}
        className="mt-3 w-full rounded-full border border-black/15 px-6 py-4 text-base font-black uppercase tracking-wide text-black/70 transition hover:border-black/30 hover:text-black"
      >
        Usar rostro / otro perfil
      </button>

      <Link
        href="/app"
        className="mt-6 w-full rounded-full border border-[#8fbf00]/40 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-[#6f9800] transition hover:border-[#8fbf00] hover:text-[#5c7d00]"
      >
        App de socio
      </Link>
    </div>
  );
}
