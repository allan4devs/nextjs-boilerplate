"use client";

import { useCallback, useMemo, useState } from "react";
import {
  countMemberLifecycle,
  EMPTY_LIFECYCLE_COUNTS,
  filterMembers,
  sortMembers,
} from "../roster";
import type {
  AdminMember,
  InviteFilter,
  MemberSort,
  MemberSortKey,
  MembershipFilter,
  PaymentFilter,
  ProfileFilter,
  RegistrationFilter,
} from "../types";

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_SORT: MemberSort = { key: "member", direction: "asc" };

/**
 * Estado de la tabla de socios: búsqueda, cuatro filtros, orden y paginación,
 * más las listas derivadas.
 *
 * Es estado de interfaz y por eso vive en un hook y no en el contexto del Admin
 * OS: cambia con cada tecla del buscador, y meterlo en el provider haría
 * re-renderizar toda la pantalla —incluidos los tabs que ni se están viendo—
 * por cada letra.
 */
/** Todo el estado de la tabla de socios, tal como lo consume el tab. */
export type MemberRoster = ReturnType<typeof useMemberRoster>;

export function useMemberRoster(members: readonly AdminMember[] | undefined) {
  const [query, setQuery] = useState("");
  const [membershipFilter, setMembershipFilter] = useState<MembershipFilter>("all");
  const [registrationFilter, setRegistrationFilter] = useState<RegistrationFilter>("all");
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("all");
  const [inviteFilter, setInviteFilter] = useState<InviteFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [memberPage, setMemberPage] = useState(1);
  const [memberPageSize, setMemberPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [memberSort, setMemberSort] = useState<MemberSort>(DEFAULT_SORT);

  const memberLifecycleCounts = useMemo(
    () => (members ? countMemberLifecycle(members) : EMPTY_LIFECYCLE_COUNTS),
    [members],
  );

  const filteredMembers = useMemo(
    () =>
      members
        ? filterMembers(members, {
            query,
            membership: membershipFilter,
            registration: registrationFilter,
            profile: profileFilter,
            invite: inviteFilter,
            payment: paymentFilter,
          })
        : [],
    [
      members,
      query,
      membershipFilter,
      registrationFilter,
      profileFilter,
      inviteFilter,
      paymentFilter,
    ],
  );

  const sortedMembers = useMemo(
    () => sortMembers(filteredMembers, memberSort),
    [filteredMembers, memberSort],
  );

  // Cambiar cualquier criterio manda de vuelta a la primera página: quedarse en
  // la 7 de una lista que ahora tiene 2 dejaría la tabla vacía. Se ajusta
  // durante el render y no en un efecto, que provocaría un segundo commit.
  const criteria = [
    query,
    membershipFilter,
    registrationFilter,
    profileFilter,
    inviteFilter,
    paymentFilter,
    memberSort.key,
    memberSort.direction,
    memberPageSize,
  ].join("|");
  const [lastCriteria, setLastCriteria] = useState(criteria);
  if (lastCriteria !== criteria) {
    setLastCriteria(criteria);
    setMemberPage(1);
  }

  const memberTotalPages = Math.max(1, Math.ceil(sortedMembers.length / memberPageSize));
  // La página vigente se acota al derivarla, así que borrar socios no puede
  // dejar la tabla fuera de rango y no hace falta un efecto que la corrija.
  const safeMemberPage = Math.min(memberPage, memberTotalPages);

  const pagedMembers = useMemo(() => {
    const start = (safeMemberPage - 1) * memberPageSize;
    return sortedMembers.slice(start, start + memberPageSize);
  }, [sortedMembers, safeMemberPage, memberPageSize]);

  // Estable entre renders: es lo que hace que los <SortableMemberHeader/>
  // memoizados se salteen el re-render cuando cambia cualquier otra cosa.
  const toggleMemberSort = useCallback((key: MemberSortKey) => {
    setMemberSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  return {
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
    paymentFilter,
    setPaymentFilter,
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
  };
}
