"use client";

/**
 * Tab Perfil — tutorial, comunidad, foto, cedula de acceso,
 * meta/preferencias, carne digital, showcase de badges,
 * seguridad (PIN), preferencias de correo e invitados.
 */

import {
  Bell,
  Camera,
  CreditCard,
  Goal,
  Loader2,
  Pin,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { GameButton } from "../../GameOS";
import Avatar from "../Avatar";
import Barcode from "../Barcode";
import { GOALS, REMINDERS, TRAININGS } from "../constants";
import { formatCedulaInput } from "../utils";
import type { MemberOs } from "../useMemberOs";

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
  } = os;

  return (
    <div className="space-y-8">
      <button
        type="button"
        onClick={() => {
          setTab("resumen");
          setShowTour(true);
        }}
        className="flex w-full items-center justify-between border border-[#d8ff3e]/30 bg-[#d8ff3e]/10 p-5 text-left transition hover:bg-[#d8ff3e]/15"
      >
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-[#d8ff3e]">Tutorial</p>
          <p className="mt-1 font-black uppercase">Ver el tour de bienvenida otra vez</p>
        </div>
        <Sparkles className="h-6 w-6 text-[#d8ff3e]" />
      </button>
      <a href="/app/comunidad" className="flex items-center justify-between border border-cyan-300/30 bg-cyan-300/10 p-5 transition hover:bg-cyan-300/15">
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">Comunidad Xtreme</p><p className="mt-1 font-black uppercase">Liga mensual, referidos y compas</p></div>
        <Users className="h-6 w-6 text-cyan-300" />
      </a>
      <div className="border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-3">
          <Camera className="h-5 w-5 text-[#d8ff3e]" />
          <h2 className="text-lg font-black uppercase">Foto de perfil</h2>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-5">
          <Avatar
            name={memberName || "Xtreme"}
            photoUrl={currentMember.photoUrl}
            className="h-24 w-24"
            textClass="text-3xl"
          />
          <div className="min-w-0 flex-1">
            <label
              className={`inline-flex cursor-pointer items-center gap-2 bg-[#d8ff3e] px-4 py-3 font-black uppercase text-black transition hover:bg-white ${
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
            <p className="mt-2 text-sm font-black uppercase text-white/70">
              {levelName} · Nv. {level}
              {gami ? ` · ${gami.xp} XP` : ""}
            </p>
            <p className="mt-1 text-xs font-semibold text-white/45">
              Se recorta al centro y se guarda en su perfil. Aparece en el carne digital,
              la pantalla de ingreso y el panel del coach.
            </p>
          </div>
        </div>
      </div>

      <div className="border-[3px] border-white/15 bg-[#0c0c0c] p-4 shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-5">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-[#d8ff3e]" />
          <h2 className="text-lg font-black uppercase">Cédula de acceso</h2>
        </div>
        <p className="mt-2 text-sm font-bold text-white/50">
          Con esta cédula entra a la app y a recepción (lector de barras).
        </p>
        <label className="mt-4 block">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
            Número de cédula
          </span>
          <input
            value={memberCedulaInput}
            onChange={(event) => setMemberCedulaInput(formatCedulaInput(event.target.value))}
            inputMode="numeric"
            disabled={!unlocked}
            placeholder="1-2345-6789"
            className="mt-2 w-full border-[3px] border-white/20 bg-black/40 px-3 py-3 text-center font-black tracking-widest text-white outline-none focus:border-[#d8ff3e] disabled:opacity-45"
          />
        </label>
        <GameButton
          className="mt-3"
          full
          disabled={!unlocked}
          onClick={() =>
            void saveProfileField(
              { cedula: memberCedulaInput },
              "Cedula guardada. Ya puede usarla con el lector.",
            )
          }
        >
          Guardar cédula
        </GameButton>
      </div>

      <div className="border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-3">
          <Goal className="h-5 w-5 text-[#d8ff3e]" />
          <h2 className="text-lg font-black uppercase">Meta y preferencias</h2>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Mi meta</span>
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
          <label className="block sm:col-span-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
              Entrenamiento favorito
            </span>
            <select
              value={currentMember.favoriteTraining}
              onChange={(event) => {
                const favoriteTraining = event.target.value;
                setMember((prev) =>
                  prev ? { ...prev, favoriteTraining } : prev,
                );
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
          <div className="sm:col-span-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
              Meta semanal (dias)
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
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
                  className={`min-w-12 border px-3 py-2.5 text-sm font-black transition disabled:opacity-45 ${
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
        </div>
        <button
          type="button"
          onClick={() =>
            void saveProfileField(
              {
                goal,
                favoriteTraining: currentMember.favoriteTraining,
                phone: memberPhoneInput,
                email: memberEmailInput,
              },
              "Meta y contacto guardados.",
            )
          }
          disabled={!unlocked}
          className="mt-4 bg-[#d8ff3e] px-4 py-3 font-black uppercase text-black transition hover:bg-white disabled:opacity-45"
        >
          Guardar meta y favorito
        </button>
      </div>

      <div className="border border-white/10 bg-gradient-to-br from-[#d8ff3e]/10 to-orange-400/[0.06] p-5">
        <div className="flex items-center gap-3">
          <QrCode className="h-5 w-5 text-[#d8ff3e]" />
          <h2 className="text-lg font-black uppercase">Carne digital</h2>
        </div>
        {memberName ? (
          <>
            <div className="mt-4 border border-white/10 bg-black/40 p-4">
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
                    <p className="mt-1 truncate text-lg font-black uppercase leading-tight">{memberName}</p>
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
              <div className="mt-4">
                <Barcode value={accessCode} />
              </div>
              <p className="mt-2 text-center text-sm font-black tracking-[0.3em] text-white/70">{accessCode}</p>
            </div>
            <p className="mt-3 text-xs font-semibold text-white/45">
              Mostra este codigo en recepcion para tu check-in.
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm font-semibold text-white/45">
            Entra con tu nombre para generar tu carne de acceso.
          </p>
        )}
      </div>

      <div className="border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-3">
          <Pin className="h-5 w-5 text-[#d8ff3e]" />
          <h2 className="text-lg font-black uppercase">Showcase de badges</h2>
        </div>
        <p className="mt-2 text-xs font-semibold text-white/45">
          Elija hasta 3 badges ganados para mostrar en su carne.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(serverBadges.length ? serverBadges.filter((b) => b.earned) : achievements.filter((a) => a.done))
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
                  className={`flex items-center justify-between border px-3 py-3 text-left text-sm font-bold transition disabled:opacity-45 ${
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
              Todavia no tiene badges. Entrene y vuelva.
            </p>
          )}
        </div>
      </div>

      <div className="border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-[#d8ff3e]" />
          <h2 className="text-lg font-black uppercase">Seguridad y contacto</h2>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Telefono</span>
            <input
              value={memberPhoneInput}
              onChange={(event) => setMemberPhoneInput(event.target.value)}
              inputMode="tel"
              placeholder="Ej. 88984000"
              className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none placeholder:text-white/30 focus:border-[#d8ff3e]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Correo</span>
            <input
              value={memberEmailInput}
              onChange={(event) => setMemberEmailInput(event.target.value)}
              type="email"
              placeholder="correo@ejemplo.com"
              className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none placeholder:text-white/30 focus:border-[#d8ff3e]"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={saveProfile}
            disabled={!unlocked}
            className="bg-[#d8ff3e] px-4 py-3 font-black uppercase text-black transition hover:bg-white disabled:opacity-45"
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
            disabled={!memberName}
            className="border border-white/15 px-4 py-3 font-black uppercase text-white/70 transition hover:border-[#d8ff3e] hover:text-[#eaff93] disabled:opacity-45"
          >
            Cambiar PIN
          </button>
        </div>
        <p className="mt-3 text-xs font-semibold text-white/42">
          El correo sirve para recuperar el PIN con codigo OTP. El telefono evita perfiles
          duplicados.
        </p>
      </div>

      <div className="border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-yellow-300" />
          <h2 className="text-lg font-black uppercase">Preferencias de correo</h2>
        </div>
        <div className="mt-4 grid gap-2">
          {(
            [
              ["streakRisk", "Racha en riesgo"],
              ["milestones", "Hitos y badges"],
              ["renewalReminders", "Renovacion de membresia"],
              ["winBack", "Volver a entrenar"],
              ["weeklyRecap", "Resumen semanal / mensual"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              disabled={!unlocked}
              onClick={() => toggleNotifPref(key)}
              className={`flex items-center justify-between border px-3 py-3 text-left text-sm font-bold transition disabled:opacity-45 ${
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
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
            Aviso rapido ahora
          </p>
          <div className="mt-3 grid gap-2">
            {REMINDERS.map((reminder) => (
              <button
                key={reminder}
                type="button"
                onClick={() => setSelectedReminder(reminder)}
                className={`border px-3 py-3 text-left text-sm font-bold transition ${
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
            className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-yellow-300 px-4 py-3 font-black uppercase text-black transition hover:bg-white disabled:opacity-45"
          >
            {isSendingReminder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Enviar aviso a mi correo
          </button>
        </div>
      </div>

      <div className="border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-[#d8ff3e]" />
          <h2 className="text-lg font-black uppercase">Invita a un compa</h2>
        </div>
        <p className="mt-4 text-sm font-semibold text-white/55">
          Pase de cortesia para entrenar una vez con usted.
        </p>
        <div className="mt-4 border border-[#d8ff3e]/30 bg-[#d8ff3e]/10 p-4 text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d8ff3e]">Codigo invitado</p>
          <p className="mt-2 text-2xl font-black tracking-[0.18em] text-white">
            XT-{accessCode.replace(/\s/g, "").slice(0, 5)}
          </p>
        </div>
      </div>
    </div>
  );
}
