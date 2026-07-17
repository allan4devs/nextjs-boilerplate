/**
 * Clasificación pura de búsquedas de socio.
 * Compartida por Member / Ingreso / Reception / Admin / Trainer / Community.
 * Sin Node crypto → se puede importar también en el cliente.
 *
 * Prioridad de identidad: cédula > código de acceso (8) > nombre/teléfono.
 */

export type MemberSearchClass =
  | { kind: "empty" }
  | { kind: "cedula"; cedula: string; q?: string }
  | { kind: "code"; code: string; cedula?: string; q?: string }
  | { kind: "text"; q: string; cedula?: string; code?: string };

export type MemberLookupParams = {
  /** Cédula (dígitos o con guiones). Mayor key. */
  cedula?: string;
  /** Código de acceso de 8 dígitos de la app. */
  code?: string;
  /** Texto libre: nombre, teléfono o cédula/código embebidos. */
  q?: string;
  /** normalizedName / memberKey de sesión. */
  memberKey?: string;
  /** Nombre exacto o casi exacto. */
  memberName?: string;
};

export function digitsOnly(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 20);
}

/**
 * Interpreta lo que el usuario digita o el lector de barras manda.
 * Regla dura: 9+ dígitos (o guiones + 6+) = cédula, nunca código de 8.
 */
export function classifyMemberSearchInput(raw: string): MemberSearchClass {
  const q = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!q) return { kind: "empty" };

  const digits = digitsOnly(q);
  const compact = q.replace(/\s/g, "");
  const hasLetters = /[A-Za-zÁÉÍÓÚáéíóúÑñÜü]/.test(q);

  // Cédula CR: 9 dígitos típicos; con guiones (1-2345-6789); lector manda puro dígitos.
  if (!hasLetters && (digits.length >= 9 || (/-/.test(q) && digits.length >= 6))) {
    return { kind: "cedula", cedula: digits, q };
  }

  // Código de acceso del socio en la app: siempre 8 dígitos.
  if (!hasLetters && digits.length === 8 && compact.replace(/-/g, "") === digits) {
    return { kind: "code", code: digits, cedula: digits, q };
  }

  // 4–7 dígitos puros: parcial de código, teléfono o cédula incompleta → probar varios.
  if (!hasLetters && digits.length >= 4 && compact === digits) {
    return {
      kind: "text",
      q,
      code: digits,
      cedula: digits.length >= 6 ? digits : undefined,
    };
  }

  // Nombre / mixto: si trae muchos dígitos, también pasa cédula por si acaso.
  return {
    kind: "text",
    q,
    cedula: digits.length >= 6 ? digits : undefined,
    code: digits.length === 8 ? digits : undefined,
  };
}

/** Une params explícitos + clasificación de q en un solo objeto de lookup. */
export function buildMemberLookupParams(input: MemberLookupParams): MemberLookupParams {
  const out: MemberLookupParams = { ...input };
  if (input.q) {
    const classified = classifyMemberSearchInput(input.q);
    if (classified.kind === "cedula") {
      out.cedula = out.cedula || classified.cedula;
      out.q = classified.q || input.q;
    } else if (classified.kind === "code") {
      out.code = out.code || classified.code;
      out.cedula = out.cedula || classified.cedula;
      out.q = classified.q || input.q;
    } else if (classified.kind === "text") {
      out.cedula = out.cedula || classified.cedula;
      out.code = out.code || classified.code;
      out.q = classified.q || input.q;
    }
  }
  if (out.cedula) out.cedula = digitsOnly(out.cedula) || out.cedula;
  if (out.code) out.code = digitsOnly(out.code);
  return out;
}

/** Query string para /api/xtreme/checkin (y equivalentes). */
export function memberLookupToSearchParams(input: MemberLookupParams): URLSearchParams {
  const p = buildMemberLookupParams(input);
  const params = new URLSearchParams();
  if (p.cedula) params.set("cedula", p.cedula);
  if (p.code) params.set("code", p.code);
  if (p.q) params.set("q", p.q);
  if (p.memberKey) params.set("memberKey", p.memberKey);
  if (p.memberName) params.set("memberName", p.memberName);
  return params;
}
