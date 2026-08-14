/**
 * Reglas del padrón del Admin OS: contar, filtrar y ordenar socios.
 *
 * Funciones puras, sin React: la política de "quién califica" y "en qué orden
 * se ve" se puede razonar y probar sin montar la pantalla, y el hook que las
 * usa solo se ocupa del estado.
 */
import type {
  AdminMember,
  InviteFilter,
  MemberLifecycleCounts,
  MemberSort,
  MembershipFilter,
  ProfileFilter,
  RegistrationFilter,
} from "./types";

export type MemberFilters = {
  query: string;
  membership: MembershipFilter;
  registration: RegistrationFilter;
  profile: ProfileFilter;
  invite: InviteFilter;
};

export const EMPTY_LIFECYCLE_COUNTS: Required<MemberLifecycleCounts> = {
  registered: 0,
  not_registered: 0,
  no_email: 0,
  audited: 0,
  pending: 0,
  sent: 0,
  not_sent: 0,
  active: 0,
  warning: 0,
  expired: 0,
};

/** Un socio "auditado" confirmó su ficha, sea por profileClaim o verificando correo. */
function isAudited(member: AdminMember) {
  return member.profileClaimed === true || member.emailVerified === true;
}

function hasEmail(member: AdminMember) {
  return Boolean(member.email?.trim());
}

/** Conteos de los chips de filtro: una sola pasada por el padrón. */
export function countMemberLifecycle(
  members: readonly AdminMember[],
): Required<MemberLifecycleCounts> {
  const counts = { ...EMPTY_LIFECYCLE_COUNTS };

  for (const member of members) {
    counts[member.membershipStatus] += 1;

    if (!hasEmail(member)) counts.no_email += 1;
    else if (member.emailVerified === true) counts.registered += 1;
    else counts.not_registered += 1;

    if (isAudited(member)) counts.audited += 1;
    else counts.pending += 1;

    if (member.campaignInviteSent === true) counts.sent += 1;
    else counts.not_sent += 1;
  }

  return counts;
}

function matchesQuery(member: AdminMember, query: string) {
  if (!query) return true;
  return (
    member.memberName.toUpperCase().includes(query) ||
    member.accessCode.replace(/\s/g, "").includes(query.replace(/\s/g, "")) ||
    member.phone.includes(query) ||
    member.coach.toUpperCase().includes(query) ||
    member.goal.toUpperCase().includes(query) ||
    member.plan.toUpperCase().includes(query) ||
    (member.email || "").toUpperCase().includes(query) ||
    (member.cedula || "").includes(query)
  );
}

function matchesRegistration(member: AdminMember, filter: RegistrationFilter) {
  switch (filter) {
    case "registered":
      return member.emailVerified === true;
    case "not_registered":
      return member.emailVerified !== true && hasEmail(member);
    case "no_email":
      return !hasEmail(member);
    default:
      return true;
  }
}

export function filterMembers(
  members: readonly AdminMember[],
  filters: MemberFilters,
): AdminMember[] {
  const query = filters.query.trim().toUpperCase();

  return members.filter((member) => {
    if (filters.membership !== "all" && member.membershipStatus !== filters.membership) {
      return false;
    }
    if (!matchesRegistration(member, filters.registration)) return false;

    const audited = isAudited(member);
    if (filters.profile === "audited" && !audited) return false;
    if (filters.profile === "pending" && audited) return false;

    if (filters.invite === "sent" && member.campaignInviteSent !== true) return false;
    if (filters.invite === "not_sent" && member.campaignInviteSent === true) return false;

    return matchesQuery(member, query);
  });
}

/** Días hasta/desde el vencimiento: número real, negativo si ya venció. */
function daysLeft(member: AdminMember) {
  const value = Number(member.daysRemaining);
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}

function sortValue(member: AdminMember, key: MemberSort["key"]): string | number {
  switch (key) {
    case "member":
      return member.memberName;
    case "contact":
      return member.phone || member.email;
    case "streak":
      return Number(member.streak) || 0;
    case "coach":
      return member.coach;
    case "membership":
      // Siempre por días restantes/vencidos, nunca por texto del plan o estado.
      return daysLeft(member);
    case "code":
      return Number(member.accessCode.replace(/\D/g, "")) || 0;
    case "plan":
      return member.trainingPlan?.title || "";
  }
}

/**
 * Ordena una copia del padrón. El nombre siempre desempata, para que dos
 * recargas con los mismos datos den exactamente la misma lista.
 */
export function sortMembers(
  members: readonly AdminMember[],
  sort: MemberSort,
): AdminMember[] {
  const collator = new Intl.Collator("es-CR", { numeric: true, sensitivity: "base" });
  const direction = sort.direction === "asc" ? 1 : -1;

  return [...members].sort((left, right) => {
    if (sort.key === "membership") {
      const diff = daysLeft(left) - daysLeft(right);
      if (diff) return diff * direction;
      return collator.compare(left.memberName, right.memberName);
    }

    const leftValue = sortValue(left, sort.key);
    const rightValue = sortValue(right, sort.key);
    // Los vacíos van al final, sin importar la dirección: son datos faltantes,
    // no un valor "menor".
    const leftBlank = leftValue === "" || leftValue == null;
    const rightBlank = rightValue === "" || rightValue == null;
    if (leftBlank !== rightBlank) return leftBlank ? 1 : -1;

    const comparison =
      typeof leftValue === "number" && typeof rightValue === "number"
        ? leftValue - rightValue
        : collator.compare(String(leftValue), String(rightValue));
    return comparison
      ? comparison * direction
      : collator.compare(left.memberName, right.memberName);
  });
}
