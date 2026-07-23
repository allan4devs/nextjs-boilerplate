"use client";

/**
 * Tab Perfil - hub de paneles en 2 columnas.
 * El socio toca un cuadro grande para abrir el ajuste; no hay un scroll
 * eterno de formularios abiertos.
 */

import { useState } from "react";
import {
  Bell,
  Camera,
  CreditCard,
  Goal,
  HelpCircle,
  Loader2,
  Pin,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import { GameButton } from "../../GameOS";
import Avatar from "../Avatar";
import MemberQrCode from "../MemberQrCode";
import PanelHub, { type HubPanel } from "../PanelHub";
import PaymentHistory from "../PaymentHistory";
import PushNotificationsCard from "../PushNotificationsCard";
import { GOALS, REMINDERS, TRAININGS } from "../constants";
import { formatCedulaInput } from "../utils";
import type { MemberOs } from "../useMemberOs";

const NOTIF_LABELS = [
  ["streakRisk", "Racha en riesgo"],
  ["milestones", "Hitos y badges"],
  ["renewalReminders", "Renovacion de membresia"],
  ["winBack", "Volver a entrenar"],
  ["weeklyRecap", "Resumen semanal / mensual"],
] as const;

export default function PerfilTab({ os }: { os: MemberOs }) {
  const {
    unlocked,
    memberName,
    currentMember,
    setMember,
    setTab,
    setShowTour,
    goal,
    setGoal,
    memberCedulaInput,
    setMemberCedulaInput,
    memberPhoneInput,
    setMemberPhoneInput,
    memberEmailInput,
    setMemberEmailInput,
    saveProfile,
    saveProfileField,
    uploadPhoto,
    isUploadingPhoto,
    levelName,
    level,
    gami,
    weeklyGoal,
    weekDoneCount,
    accessCode,
    pinnedBadgeIds,
    serverBadges,
    achievements,
    unlockedCount,
    togglePinnedBadge,
    notifPrefs,
    toggleNotifPref,
    selectedReminder,
    setSelectedReminder,
    activateReminder,
    isSendingReminder,
    setError,
    setMessage,
    setPinMode,
    setShowPin,
    paymentHistory,
    isLoadingPayments,
  } = os;

  const [activeId, setActiveId] = useState<string | null>(null);

  const pinnedNames = pinnedBadgeIds
    .map((id) => serverBadges.find((badge) => badge.id === id)?.name ?? id)
    .join(" · ");
  const activeNotifs = NOTIF_LABELS.filter(([key]) => notifPrefs[key]).length;

  const closeAfterSave = (saved: boolean) => {
    if (saved) setActiveId(null);
  };

  const panels: HubPanel[] = [
    {
      id: "cedula",
      label: "Cédula",
      hint: memberCedulaInput || "Sin cédula",
      icon: CreditCard,
      tone: "lime",
      content: (
        <div className="space-y-3">
          <p className="text-sm font-bold text-white/50">
            Con esta cédula entra a la app y a recepción (lector de barras).
          </p>
          <input
            value={memberCedulaInput}
            onChange={(event) => setMemberCedulaInput(formatCedulaInput(event.target.value))}
            inputMode="numeric"
            disabled={!unlocked}
            placeholder="1-2345-6789"
            aria-label="Número de cédula"
            className="w-full border-[3px] border-white/20 bg-black/40 px-3 py-3.5 text-center font-black tracking-widest text-white outline-none focus:border-[#d8ff3e] disabled:opacity-45"
          />
          <GameButton
            full
            disabled={!unlocked}
            onClick={() =>
              void saveProfileField(
                { cedula: memberCedulaInput },
                "Cédula guardada. Ya podés usarla con el lector.",
              ).then(closeAfterSave)
            }
          >
            Guardar cédula
          </GameButton>
        </div>
      ),
    },
    {
      id: "meta",
      label: "Meta",
      hint: `${goal} · ${weeklyGoal} d/sem`,
      icon: Goal,
      tone: "orange",
      badge: currentMember.favoriteTraining ? "★" : undefined,
      content: (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                Mi meta
              </span>
              <select
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                disabled={!unlocked}
                className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none focus:border-[#d8ff3e] disabled:opacity-45"
              >
                {GOALS.map((g) => (
                  <option key={g} value={g} className="bg-black">
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                Entrenamiento favorito
              </span>
              <select
                value={currentMember.favoriteTraining}
                onChange={(event) => {
                  const favoriteTraining = event.target.value;
                  setMember((prev) => (prev ? { ...prev, favoriteTraining } : prev));
                }}
                disabled={!unlocked}
                className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none focus:border-[#d8ff3e] disabled:opacity-45"
              >
                <option value="" className="bg-black">
                  Sin preferencia
                </option>
                {TRAININGS.map((t) => (
                  <option key={t.id} value={t.name} className="bg-black">
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
              Meta semanal (días)
            </span>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {[2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={!unlocked}
                  onClick={() =>
                    void saveProfileField(
                      { weeklyGoal: n },
                      `Meta semanal: ${n} dias. A entrenar.`,
                    )
                  }
                  className={`min-h-12 border-[3px] text-base font-black transition disabled:opacity-45 ${
                    weeklyGoal === n
                      ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                      : "border-white/15 text-white/70 hover:border-[#d8ff3e]/50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs font-semibold text-white/42">
              Esta semana: {weekDoneCount}/{weeklyGoal}
              {gami?.weeksStreak ? ` · ${gami.weeksStreak} semanas en racha` : ""}
            </p>
          </div>
          <GameButton
            full
            disabled={!unlocked}
            onClick={() =>
              void saveProfileField(
                {
                  goal,
                  favoriteTraining: currentMember.favoriteTraining,
                  phone: memberPhoneInput,
                  email: memberEmailInput,
                },
                "Meta y contacto guardados.",
              ).then(closeAfterSave)
            }
          >
            Guardar meta y favorito
          </GameButton>
        </div>
      ),
    },
    {
      id: "badges",
      label: "Badges",
      hint: pinnedNames || "Ninguno fijado",
      icon: Pin,
      tone: "lime",
      badge: pinnedBadgeIds.length ? String(pinnedBadgeIds.length) : undefined,
      content: (
        <div>
          <p className="text-xs font-semibold text-white/45">
            Elegí hasta 3 badges ganados para mostrar en tu carné.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(serverBadges.length
              ? serverBadges.filter((b) => b.earned)
              : achievements.filter((a) => a.done)
            )
              .slice(0, 12)
              .map((b) => {
                const id = "id" in b ? b.id : (b as { id: string }).id;
                const name = "name" in b ? b.name : "";
                const pinned = pinnedBadgeIds.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => togglePinnedBadge(id)}
                    className={`flex min-h-12 items-center justify-between border-[3px] px-3 py-3 text-left text-sm font-bold transition disabled:opacity-45 ${
                      pinned
                        ? "border-[#d8ff3e] bg-[#d8ff3e]/15 text-[#eaff93]"
                        : "border-white/10 bg-black/20 text-white/60 hover:border-white/25"
                    }`}
                  >
                    <span>{name}</span>
                    <span className="text-[10px] font-black uppercase tracking-wide">
                      {pinned ? "Fijado" : "Fijar"}
                    </span>
                  </button>
                );
              })}
            {!unlockedCount && (
              <p className="text-sm font-semibold text-white/45 sm:col-span-2">
                Todavía no tenés badges. Entrená y volvé.
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "seguridad",
      label: "Seguridad",
      hint: memberPhoneInput || memberEmailInput || "Contacto y PIN",
      icon: ShieldCheck,
      tone: "cyan",
      content: (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                Teléfono
              </span>
              <input
                value={memberPhoneInput}
                onChange={(event) => setMemberPhoneInput(event.target.value)}
                inputMode="tel"
                placeholder="Ej. 88984000"
                className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3.5 font-bold text-white outline-none placeholder:text-white/30 focus:border-[#d8ff3e]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                Correo
              </span>
              <input
                value={memberEmailInput}
                onChange={(event) => setMemberEmailInput(event.target.value)}
                type="email"
                placeholder="correo@ejemplo.com"
                className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3.5 font-bold text-white outline-none placeholder:text-white/30 focus:border-[#d8ff3e]"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void saveProfile().then(closeAfterSave)}
              disabled={!unlocked}
              className="min-h-12 bg-[#d8ff3e] px-4 py-3 font-black uppercase text-black transition hover:bg-white disabled:opacity-45"
            >
              Guardar contacto
            </button>
            <button
              type="button"
              onClick={() => {
                setError("");
                setMessage("");
                setPinMode("change");
                setShowPin(true);
              }}
              disabled={!memberName || !unlocked}
              className="min-h-12 border-[3px] border-white/15 px-4 py-3 font-black uppercase text-white/70 transition hover:border-[#d8ff3e] hover:text-[#eaff93] disabled:opacity-45"
            >
              Cambiar PIN
            </button>
          </div>
          <p className="text-xs font-semibold text-white/42">
            El correo sirve para recuperar el PIN con código OTP. Si lo cambiás, te mandamos un
            enlace al correo nuevo para confirmarlo (así no queda un correo mal escrito bloqueado).
            El teléfono evita perfiles duplicados.
          </p>
          {currentMember.email && currentMember.emailVerified === false && (
            <p className="text-xs font-bold text-orange-200/90">
              Correo pendiente de confirmar. Revisá la bandeja (y spam) del correo que guardaste.
            </p>
          )}
        </div>
      ),
    },
    {
      id: "avisos",
      label: "Avisos",
      hint: `${activeNotifs}/${NOTIF_LABELS.length} correo · push`,
      icon: Bell,
      tone: "yellow",
      badge: String(activeNotifs),
      content: (
        <div className="space-y-5">
          {/* Web Push del Member OS (entrenos, reservas, racha...) - no es solo comunidad */}
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[#d8ff3e]">
              Avisos de la app (este celular)
            </p>
            <p className="mb-3 text-xs font-semibold leading-relaxed text-white/45">
              Todo el Member OS: check-in, salida del gym, reservas, recordatorio ~1 h antes de clase, badges,
              plan y rachas. El correo de abajo es otro canal, por separado.
            </p>
            <PushNotificationsCard unlocked={unlocked} />
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">
              Preferencias de correo
            </p>
            <div className="grid gap-2">
              {NOTIF_LABELS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => toggleNotifPref(key)}
                  className={`flex min-h-12 items-center justify-between border-[3px] px-3 py-3 text-left text-sm font-bold transition disabled:opacity-45 ${
                    notifPrefs[key]
                      ? "border-yellow-300/50 bg-yellow-300/10 text-yellow-100"
                      : "border-white/10 bg-black/20 text-white/45"
                  }`}
                >
                  <span>{label}</span>
                  <span className="text-[10px] font-black uppercase">
                    {notifPrefs[key] ? "On" : "Off"}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold text-white/42">
              Estos switches controlan el correo. El push del celular se activa arriba. Si querés
              dejar de recibir correos opcionales, usá el enlace de preferencias o pedilo en
              recepción.
            </p>
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
              Aviso rápido por correo
            </p>
            <div className="mt-3 grid gap-2">
              {REMINDERS.map((reminder) => (
                <button
                  key={reminder}
                  type="button"
                  onClick={() => setSelectedReminder(reminder)}
                  className={`min-h-11 border px-3 py-3 text-left text-sm font-bold transition ${
                    selectedReminder === reminder
                      ? "border-yellow-300 bg-yellow-300/10 text-yellow-100"
                      : "border-white/10 bg-black/20 text-white/55 hover:border-white/25"
                  }`}
                >
                  {reminder}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void activateReminder()}
              disabled={!unlocked || isSendingReminder}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-yellow-300 px-4 py-3 font-black uppercase text-black transition hover:bg-white disabled:opacity-45"
            >
              {isSendingReminder ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              Enviar aviso a mi correo
            </button>
          </div>
        </div>
      ),
    },
    {
      id: "carne",
      label: "Carné",
      hint: memberName ? accessCode : "Sin sesión",
      icon: QrCode,
      tone: "lime",
      content: memberName ? (
        <div>
          <div className="border-[3px] border-[#d8ff3e]/35 bg-gradient-to-b from-[#141414] to-black p-4 shadow-[4px_4px_0_rgba(216,255,62,0.18)]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  name={memberName}
                  photoUrl={currentMember.photoUrl}
                  className="h-12 w-12"
                  textClass="text-base"
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#d8ff3e]">
                    Socio Xtreme · {levelName}
                  </p>
                  <p className="mt-1 truncate text-lg font-black uppercase leading-tight">
                    {memberName}
                  </p>
                </div>
              </div>
              <span className="shrink-0 border border-[#d8ff3e]/40 bg-[#d8ff3e]/10 px-2 py-1 text-[10px] font-black uppercase text-[#eaff93]">
                Activo
              </span>
            </div>
            {pinnedBadgeIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {pinnedBadgeIds.map((id) => {
                  const b = serverBadges.find((x) => x.id === id);
                  return (
                    <span
                      key={id}
                      className="border border-[#d8ff3e]/30 bg-[#d8ff3e]/10 px-2 py-1 text-[10px] font-black uppercase text-[#eaff93]"
                    >
                      {b?.name ?? id}
                    </span>
                  );
                })}
              </div>
            )}
            <div className="mt-5 flex flex-col items-center">
              <MemberQrCode value={accessCode} size={220} label={accessCode} />
              <p className="mt-3 font-mono text-base font-black tracking-[0.35em] text-white">
                {accessCode}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                Código de acceso
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-white/45">
            Mostrá este QR en recepción para tu check-in. Pase de invitado: XT-
            {accessCode.replace(/\s/g, "").slice(0, 5)}
          </p>
        </div>
      ) : (
        <p className="text-sm font-semibold text-white/45">
          Entrá con tu nombre para generar tu carné de acceso.
        </p>
      ),
    },
    {
      id: "pagos",
      label: "Pagos",
      hint: isLoadingPayments
        ? "Cargando..."
        : paymentHistory
          ? `${paymentHistory.payments.length} registros`
          : "Historial",
      icon: WalletCards,
      tone: "orange",
      content: (
        <div>
          {isLoadingPayments && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#d8ff3e]" />
            </div>
          )}
          {!isLoadingPayments && unlocked && paymentHistory && (
            <PaymentHistory
              payments={paymentHistory.payments}
              entitlements={paymentHistory.entitlements}
            />
          )}
          {!isLoadingPayments && (!unlocked || !paymentHistory) && (
            <p className="text-sm font-semibold text-white/45">
              {unlocked
                ? "Todavía no hay pagos registrados."
                : "Desbloqueá tu sesión para ver el historial."}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "atajos",
      label: "Atajos",
      hint: "Tour y comunidad",
      icon: Sparkles,
      tone: "cyan",
      content: (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setTab("resumen");
              setShowTour(true);
            }}
            className="flex min-h-[100px] flex-col items-start justify-between border-[3px] border-[#d8ff3e]/40 bg-[#d8ff3e]/[0.08] p-4 text-left transition hover:bg-[#d8ff3e]/15"
          >
            <Sparkles className="h-8 w-8 text-[#d8ff3e]" />
            <span>
              <span className="block text-[10px] font-black uppercase tracking-[.18em] text-[#d8ff3e]">
                Tutorial
              </span>
              <span className="mt-0.5 block text-sm font-black uppercase">
                Ver el tour otra vez
              </span>
            </span>
          </button>
          <a
            href="/app/comunidad"
            className="flex min-h-[100px] flex-col items-start justify-between border-[3px] border-cyan-300/40 bg-cyan-300/[0.08] p-4 transition hover:bg-cyan-300/15"
          >
            <Users className="h-8 w-8 text-cyan-300" />
            <span>
              <span className="block text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">
                Comunidad
              </span>
              <span className="mt-0.5 block text-sm font-black uppercase">
                Liga, referidos y compas
              </span>
            </span>
          </a>
        </div>
      ),
    },
    {
      id: "ayuda",
      label: "Ayuda y legal",
      hint: "App, normas y privacidad",
      icon: HelpCircle,
      tone: "yellow",
      content: (
        <div className="space-y-3">
          <p className="text-sm font-semibold leading-6 text-white/55">
            Guías del Member OS, normas del gym, condiciones de uso y privacidad.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { href: "/ayuda", label: "Centro de ayuda", detail: "PIN, reservas, primer día" },
              { href: "/preguntas", label: "Preguntas", detail: "FAQ antes de venir" },
              { href: "/normas", label: "Normas del gym", detail: "Convivencia y equipo" },
              { href: "/terminos", label: "Condiciones", detail: "Uso del servicio y app" },
              { href: "/privacidad", label: "Privacidad", detail: "Tus datos y opciones" },
              { href: "/contacto", label: "Contacto", detail: "WhatsApp y horario" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="border border-white/12 bg-black/30 px-3 py-3 transition hover:border-[#d8ff3e]/50"
              >
                <span className="block text-xs font-black uppercase text-[#d8ff3e]">{item.label}</span>
                <span className="mt-1 block text-[11px] font-semibold text-white/45">{item.detail}</span>
              </a>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="xg-tab-in">
      <PanelHub
        panels={panels}
        activeId={activeId}
        onActiveChange={setActiveId}
        title="Tu perfil"
        subtitle="Tocá un cuadro para abrir. Todo en dos columnas, sin scroll eterno."
        header={
          <div className="border-[3px] border-white/15 bg-[#0c0c0c] p-4 shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-5">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar
                name={memberName || "Xtreme"}
                photoUrl={currentMember.photoUrl}
                className="h-20 w-20"
                textClass="text-2xl"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black uppercase leading-tight">
                  {memberName || "Xtreme"}
                </p>
                <p className="mt-1 text-sm font-black uppercase text-white/60">
                  {levelName} · Nv. {level}
                  {gami ? ` · ${gami.xp} XP` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-2 border-[3px] border-[#d8ff3e] bg-[#d8ff3e] px-3 py-2 text-xs font-black uppercase text-black transition hover:bg-white ${
                      !unlocked || isUploadingPhoto ? "pointer-events-none opacity-45" : ""
                    }`}
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    {currentMember.photoUrl ? "Cambiar foto" : "Subir foto"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={!unlocked || isUploadingPhoto}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) void uploadPhoto(file);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveId("carne")}
                    className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-3 py-2 text-xs font-black uppercase text-white/70 transition hover:border-[#d8ff3e] hover:text-[#eaff93]"
                  >
                    <QrCode className="h-4 w-4" />
                    Carné
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
