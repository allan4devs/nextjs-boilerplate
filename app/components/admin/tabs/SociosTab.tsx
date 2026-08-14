"use client";

import {
  DoorOpen,
  Flame,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import {
  STATUS_STYLES,
  STATUS_LABEL,
  MEMBERSHIP_FILTERS,
  REGISTRATION_FILTERS,
  PROFILE_FILTERS,
  INVITE_FILTERS,
} from "../constants";
import {
  memberPageWindow,
} from "../helpers";
import {
  FilterChipRow,
  SortableMemberHeader,
} from "../ui";
import type { AdminData, AdminMember } from "../types";
import type { MemberRoster } from "../hooks/useMemberRoster";

/** Acciones del padrón que la tabla dispara sobre un socio. */
export type MemberTableActions = {
  openDetail: (member: AdminMember) => void;
  openEdit: (member: AdminMember) => void;
  openInvite: (member: AdminMember) => void;
  openPlan: (member: AdminMember) => void;
  openQuickPlan: (member: AdminMember) => void;
  removeMember: (memberName: string) => void;
  sendReminder: (memberName: string) => void;
  adminCheckin: (memberName: string) => void;
};

export type SociosTabProps = {
  data: AdminData;
  roster: MemberRoster;
  actions: MemberTableActions;
  /** Id de la operación en curso: deshabilita los botones de la fila. */
  busy: string;
};

/**
 * Tab de socios: buscador, filtros, tabla ordenable y paginador.
 *
 * Recibe tres props y no treinta y una: todo el estado de la tabla llega
 * junto en `roster` (el hook que lo gobierna) y las acciones agrupadas en
 * `actions`, así agregar una columna no cambia la firma del componente.
 */
export function SociosTab({ data, roster, actions, busy }: SociosTabProps) {
  const {
    query,
    setQuery,
    membershipFilter,
    setMembershipFilter,
    registrationFilter,
    setRegistrationFilter,
    profileFilter,
    setProfileFilter,
    inviteFilter,
    setInviteFilter,
    setMemberPage,
    memberPageSize,
    setMemberPageSize,
    memberSort,
    toggleMemberSort,
    memberLifecycleCounts,
    filteredMembers,
    pagedMembers,
    memberTotalPages,
    safeMemberPage,
  } = roster;
  const {
    openDetail,
    openEdit,
    openInvite,
    openPlan,
    openQuickPlan,
    removeMember,
    sendReminder,
    adminCheckin,
  } = actions;

  return (
    <>
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nombre, cédula, código, correo, coach..."
            className="w-full border border-white/12 bg-black/40 py-2.5 pl-10 pr-3 text-sm font-semibold text-white outline-none focus:border-lime-300"
          />
        </div>
        <div className="space-y-2.5 border border-white/10 bg-white/[0.03] p-3 sm:p-4">
          <FilterChipRow
            label="Membresía"
            options={MEMBERSHIP_FILTERS}
            value={membershipFilter}
            onChange={setMembershipFilter}
            counts={{
              active: memberLifecycleCounts.active,
              warning: memberLifecycleCounts.warning,
              expired: memberLifecycleCounts.expired,
            }}
            activeTone="lime"
          />
          <FilterChipRow
            label="Registro"
            options={REGISTRATION_FILTERS}
            value={registrationFilter}
            onChange={setRegistrationFilter}
            counts={{
              registered: memberLifecycleCounts.registered,
              not_registered: memberLifecycleCounts.not_registered,
              no_email: memberLifecycleCounts.no_email,
            }}
            activeTone="cyan"
          />
          <FilterChipRow
            label="Ficha"
            options={PROFILE_FILTERS}
            value={profileFilter}
            onChange={setProfileFilter}
            counts={{
              audited: memberLifecycleCounts.audited,
              pending: memberLifecycleCounts.pending,
            }}
            activeTone="violet"
          />
          <FilterChipRow
            label="Invitación"
            options={INVITE_FILTERS}
            value={inviteFilter}
            onChange={setInviteFilter}
            counts={{
              sent: memberLifecycleCounts.sent,
              not_sent: memberLifecycleCounts.not_sent,
            }}
            activeTone="orange"
          />
          {(membershipFilter !== "all" ||
            registrationFilter !== "all" ||
            profileFilter !== "all" ||
            inviteFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setMembershipFilter("all");
                setRegistrationFilter("all");
                setProfileFilter("all");
                setInviteFilter("all");
              }}
              className="text-[10px] font-black uppercase text-white/45 underline decoration-white/25 underline-offset-2 hover:text-lime-200"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className="border border-white/10 bg-white/[0.04]">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-orange-300" />
            <h2 className="text-lg font-black uppercase">
              Socios ({filteredMembers.length}/{data.members.length})
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[11px] font-black uppercase text-white/45">
              Por página
              <select
                value={memberPageSize}
                onChange={(e) => setMemberPageSize(Number(e.target.value) || 25)}
                className="border border-white/15 bg-black/40 px-2 py-1.5 text-xs font-black text-white outline-none focus:border-lime-300"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-[11px] font-semibold text-white/40">
              {filteredMembers.length === 0
                ? "0 resultados"
                : `${(safeMemberPage - 1) * memberPageSize + 1}-${Math.min(
                    safeMemberPage * memberPageSize,
                    filteredMembers.length,
                  )} de ${filteredMembers.length}`}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wide text-white/40">
                <SortableMemberHeader
                  label="Socio"
                  sortKey="member"
                  activeKey={memberSort.key}
                  direction={memberSort.direction}
                  onSort={toggleMemberSort}
                  className="px-5 py-3"
                />
                <SortableMemberHeader
                  label="Contacto"
                  sortKey="contact"
                  activeKey={memberSort.key}
                  direction={memberSort.direction}
                  onSort={toggleMemberSort}
                />
                <SortableMemberHeader
                  label="Racha"
                  sortKey="streak"
                  activeKey={memberSort.key}
                  direction={memberSort.direction}
                  onSort={toggleMemberSort}
                />
                <SortableMemberHeader
                  label="Coach"
                  sortKey="coach"
                  activeKey={memberSort.key}
                  direction={memberSort.direction}
                  onSort={toggleMemberSort}
                />
                <SortableMemberHeader
                  label="Días plan"
                  sortKey="membership"
                  activeKey={memberSort.key}
                  direction={memberSort.direction}
                  onSort={toggleMemberSort}
                />
                <SortableMemberHeader
                  label="Código"
                  sortKey="code"
                  activeKey={memberSort.key}
                  direction={memberSort.direction}
                  onSort={toggleMemberSort}
                />
                <SortableMemberHeader
                  label="Plan"
                  sortKey="plan"
                  activeKey={memberSort.key}
                  direction={memberSort.direction}
                  onSort={toggleMemberSort}
                />
                <th className="px-3 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagedMembers.map((m) => (
                <tr key={m.normalizedName} className="border-b border-white/[0.06] hover:bg-white/[0.02]">
                  <td
                    className="px-5 py-3 cursor-pointer"
                    onClick={() => openDetail(m)}
                    title="Ver informacion completa del usuario"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-black uppercase underline decoration-white/30 decoration-1 underline-offset-2 hover:text-lime-200">{m.memberName}</span>
                      {m.seeded && (
                        <span className="border border-white/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-white/40">
                          demo
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-white/40">{m.goal || "Sin objetivo"}</span>
                    {m.notes && (
                      <p className="mt-1 max-w-[220px] truncate text-[11px] text-white/30">{m.notes}</p>
                    )}
                    <span className="mt-1 inline-block text-[10px] font-black uppercase tracking-wide text-lime-300/70">Click para mas info →</span>
                  </td>
                  <td className="px-3 py-3 text-xs font-semibold text-white/55">
                    <div>{m.phone || "-"}</div>
                    <div className="truncate max-w-[160px]">{m.email || "-"}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <span
                        className={`inline-block border px-1.5 py-0.5 text-[9px] font-black uppercase ${
                          m.emailVerified
                            ? "border-lime-300/40 bg-lime-300/10 text-lime-200"
                            : m.email
                              ? "border-orange-300/40 bg-orange-300/10 text-orange-200"
                              : "border-white/15 text-white/40"
                        }`}
                        title={
                          m.emailVerified
                            ? "Correo verificado · se registró en la app"
                            : m.email
                              ? "Tiene correo pero no ha completado el registro"
                              : "Sin correo en la ficha"
                        }
                      >
                        {m.emailVerified ? "Registrado" : m.email ? "Sin registrar" : "Sin correo"}
                      </span>
                      <span
                        className={`inline-block border px-1.5 py-0.5 text-[9px] font-black uppercase ${
                          m.profileClaimed || m.emailVerified
                            ? "border-violet-300/40 bg-violet-300/10 text-violet-200"
                            : "border-white/15 text-white/40"
                        }`}
                        title={
                          m.profileClaimed || m.emailVerified
                            ? "Confirmó o corrigió los datos de la ficha"
                            : "Aún no auditó/confirmó los datos de la ficha"
                        }
                      >
                        {m.profileClaimed || m.emailVerified ? "Ficha OK" : "Sin auditar"}
                      </span>
                      <span
                        className={`inline-block border px-1.5 py-0.5 text-[9px] font-black uppercase ${
                          m.campaignInviteSent
                            ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200"
                            : "border-white/15 text-white/40"
                        }`}
                        title={
                          m.campaignInviteSent
                            ? "Ya se le envió invitación / magic link de campaña"
                            : "Todavía no se le ha enviado correo de campaña"
                        }
                      >
                        {m.campaignInviteSent ? "Correo enviado" : "Sin invitar"}
                      </span>
                      {m.hasPin ? (
                        <span
                          className="inline-block border border-lime-300/30 bg-lime-300/5 px-1.5 py-0.5 text-[9px] font-black uppercase text-lime-200/80"
                          title="Tiene PIN en la app"
                        >
                          PIN
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 font-black text-orange-300">
                      <Flame className="h-3.5 w-3.5" /> {m.streak}
                    </span>
                    <div className="text-[11px] text-white/40">
                      {m.totalWorkouts} ent · {m.totalMinutes} min
                    </div>
                  </td>
                  <td className="px-3 py-3 text-white/70">{m.coach || "-"}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-block border px-2 py-1 text-[10px] font-black uppercase ${STATUS_STYLES[m.membershipStatus]}`}>
                      {STATUS_LABEL[m.membershipStatus]}
                    </span>
                    <div
                      className={`mt-1 text-sm font-black tabular-nums ${
                        m.daysRemaining < 0
                          ? "text-red-300"
                          : m.daysRemaining <= 5
                            ? "text-orange-300"
                            : "text-lime-200"
                      }`}
                      title={
                        m.daysRemaining < 0
                          ? `Venció hace ${Math.abs(m.daysRemaining)} día(s)`
                          : `Quedan ${m.daysRemaining} día(s)`
                      }
                    >
                      {m.daysRemaining < 0
                        ? `−${Math.abs(m.daysRemaining)}d`
                        : `${m.daysRemaining}d`}
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-white/40">
                      {m.plan || "Sin plan"}
                    </div>
                    {data.role === "super" && (
                      <button
                        type="button"
                        onClick={() => openQuickPlan(m)}
                        className="mt-2 inline-flex min-h-8 items-center gap-1.5 border border-[#d8ff3e]/45 bg-[#d8ff3e]/10 px-2 text-[10px] font-black uppercase text-[#eaff93] transition hover:bg-[#d8ff3e] hover:text-black"
                      >
                        <Zap className="h-3.5 w-3.5" /> Dar plan
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs font-bold tracking-wider text-cyan-200">
                    {m.accessCode}
                  </td>
                  <td className="px-3 py-3">
                    {m.trainingPlan ? (
                      <button type="button" onClick={() => openPlan(m)} className="min-w-[120px] text-left">
                        <div className="flex items-center justify-between gap-2 text-[11px] font-black uppercase text-lime-200">
                          <span className="truncate">{m.trainingPlan.title}</span>
                          <span className="shrink-0 text-white/50">
                            {m.trainingPlan.doneItems}/{m.trainingPlan.totalItems}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full border border-white/10 bg-black/45">
                          <div className="h-full bg-lime-300" style={{ width: `${m.trainingPlan.progressPct}%` }} />
                        </div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openPlan(m)}
                        className="inline-flex items-center gap-1.5 border border-white/15 px-2.5 py-1.5 text-[11px] font-black uppercase text-white/70 transition hover:border-lime-300 hover:text-lime-200"
                      >
                        <Plus className="h-3.5 w-3.5" /> Plan
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(m)}
                        title="Editar perfil"
                        className="grid h-8 w-8 place-items-center border border-white/10 text-white/60 transition hover:border-lime-300 hover:text-lime-200"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {data.role === "super" && !m.emailVerified && (
                        <button
                          type="button"
                          onClick={() => openInvite(m)}
                          title="Invitar a la app / confirmar correo"
                          className="grid h-8 w-8 place-items-center border border-[#d8ff3e]/35 bg-[#d8ff3e]/10 text-[#eaff93] transition hover:bg-[#d8ff3e] hover:text-black"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void sendReminder(m.memberName)}
                        disabled={Boolean(busy) || !m.email || !m.emailVerified}
                        title={
                          !m.email
                            ? "Sin correo registrado"
                            : !m.emailVerified
                              ? "Correo sin verificar - usá Invitar app"
                              : "Enviar recordatorio de membresia por correo"
                        }
                        className="grid h-8 w-8 place-items-center border border-white/10 text-white/60 transition hover:border-orange-300 hover:text-orange-200 disabled:opacity-40"
                      >
                        {busy === `mail-${m.memberName}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Mail className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void adminCheckin(m.memberName)}
                        disabled={Boolean(busy)}
                        title="Registrar ingreso"
                        className="grid h-8 w-8 place-items-center border border-white/10 text-white/60 transition hover:border-cyan-300 hover:text-cyan-200 disabled:opacity-40"
                      >
                        {busy === `in-${m.memberName}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <DoorOpen className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeMember(m.memberName)}
                        disabled={Boolean(busy)}
                        title="Eliminar"
                        className="grid h-8 w-8 place-items-center border border-white/10 text-white/50 transition hover:border-red-400 hover:text-red-300 disabled:opacity-40"
                      >
                        {busy === `del-${m.memberName}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredMembers.length && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm font-semibold text-white/45">
                    Sin resultados con estos filtros. Probá «Limpiar filtros» o ampliá la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredMembers.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-[11px] font-semibold text-white/40">
              Página {safeMemberPage} de {memberTotalPages}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={safeMemberPage <= 1}
                onClick={() => setMemberPage(1)}
                className="min-h-9 border border-white/15 px-2.5 text-[11px] font-black uppercase text-white/70 transition hover:border-lime-300 hover:text-lime-200 disabled:opacity-35"
              >
                «
              </button>
              <button
                type="button"
                disabled={safeMemberPage <= 1}
                onClick={() => setMemberPage((p) => Math.max(1, p - 1))}
                className="min-h-9 border border-white/15 px-3 text-[11px] font-black uppercase text-white/70 transition hover:border-lime-300 hover:text-lime-200 disabled:opacity-35"
              >
                Anterior
              </button>
              {memberPageWindow(safeMemberPage, memberTotalPages).map((page, idx, arr) => {
                const prev = arr[idx - 1];
                const showGap = prev != null && page - prev > 1;
                return (
                  <span key={page} className="inline-flex items-center gap-1.5">
                    {showGap && (
                      <span className="px-1 text-[11px] font-black text-white/30">...</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setMemberPage(page)}
                      className={`min-h-9 min-w-9 border px-2 text-[11px] font-black transition ${
                        page === safeMemberPage
                          ? "border-lime-300 bg-lime-300 text-black"
                          : "border-white/15 text-white/70 hover:border-lime-300 hover:text-lime-200"
                      }`}
                    >
                      {page}
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                disabled={safeMemberPage >= memberTotalPages}
                onClick={() => setMemberPage((p) => Math.min(memberTotalPages, p + 1))}
                className="min-h-9 border border-white/15 px-3 text-[11px] font-black uppercase text-white/70 transition hover:border-lime-300 hover:text-lime-200 disabled:opacity-35"
              >
                Siguiente
              </button>
              <button
                type="button"
                disabled={safeMemberPage >= memberTotalPages}
                onClick={() => setMemberPage(memberTotalPages)}
                className="min-h-9 border border-white/15 px-2.5 text-[11px] font-black uppercase text-white/70 transition hover:border-lime-300 hover:text-lime-200 disabled:opacity-35"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
