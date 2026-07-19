import type { MemberDoc } from "@/lib/xtreme/shared";

/** Umbral conservador para campañas y recuperación automática del Excel. */
export const SAFE_EMAIL_NAME_SCORE = 0.72;
/** Umbral un poco más laxo solo si el correo es único y el dueño es uno. */
export const UNIQUE_OWNER_SCORE = 0.62;

function fold(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CR");
}

export function nameTokens(value: unknown) {
  return fold(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && token !== "nulo" && token !== "de" && token !== "del" && token !== "la" && token !== "los");
}

function levenshtein(left: string, right: string) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const previous = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      diagonal = previous;
    }
  }
  return row[right.length];
}

function nameVariants(tokens: string[]) {
  if (!tokens.length) return [] as string[];
  const first = tokens[0] || "";
  const last = tokens[tokens.length - 1] || "";
  const last2 = tokens.slice(-2).join("");
  const first2 = tokens.slice(0, 2).join("");
  const variants = new Set<string>([
    ...tokens,
    tokens.join(""),
    `${first}${last}`,
    `${last}${first}`,
    first2,
    last2,
    // iniciales + apellido: jperez, j.perez → jperez
    first && last ? `${first[0]}${last}` : "",
    first && last ? `${first}${last[0]}` : "",
    // solo apellidos compuestos frecuentes en CR
    tokens.length >= 3 ? `${tokens[0]}${tokens[tokens.length - 2]}` : "",
    tokens.map((t) => t[0]).join(""),
  ]);
  return [...variants].filter((v) => v.length >= 2);
}

/**
 * Compara el usuario del correo con nombre y apellidos.
 * Nunca usa el dominio. Penaliza locales basura.
 */
export function memberEmailNameScore(emailValue: unknown, memberName: unknown) {
  const localRaw = fold(String(emailValue ?? "").split("@")[0]);
  const local = localRaw.replace(/[^a-z0-9]/g, "");
  const localAlpha = local.replace(/[0-9]+/g, "");
  const tokens = nameTokens(memberName);
  if (!localAlpha || !tokens.length) return 0;

  // Placeholders obvios en el local.
  if (/^(sin|no|nulo|nada|prueba|test|correo|email|mail)(correo|email|mail)?\d*$/i.test(localAlpha)) {
    return 0;
  }

  const variants = nameVariants(tokens);
  let best = 0;
  for (const variant of variants) {
    if (!variant) continue;
    const ratio =
      Math.min(localAlpha.length, variant.length) / Math.max(localAlpha.length, variant.length);
    if (localAlpha.includes(variant) || variant.includes(localAlpha)) {
      best = Math.max(best, Math.min(1, ratio + 0.08));
    }
    best = Math.max(
      best,
      1 - levenshtein(localAlpha, variant) / Math.max(localAlpha.length, variant.length),
    );
  }

  const hits = tokens.filter((token) => token.length >= 3 && localAlpha.includes(token));
  if (hits.length >= 2) best = Math.max(best, 0.97);
  else if (hits.length === 1) {
    // Un apellido o nombre claro dentro del local ya es señal fuerte en CR.
    best = Math.max(best, hits[0].length >= 5 ? 0.86 : SAFE_EMAIL_NAME_SCORE);
  }

  // inicial + apellido: j + perez
  const first = tokens[0] || "";
  const last = tokens[tokens.length - 1] || "";
  if (first && last.length >= 4) {
    const pattern = `${first[0]}${last}`;
    if (localAlpha.startsWith(pattern) || localAlpha.includes(pattern)) {
      best = Math.max(best, 0.9);
    }
    if (localAlpha.includes(last) && localAlpha[0] === first[0]) {
      best = Math.max(best, 0.88);
    }
  }

  // apellido al inicio del local (perez.juan / perezjuan)
  if (last.length >= 4 && (localAlpha.startsWith(last) || localAlpha.includes(last))) {
    best = Math.max(best, first && localAlpha.includes(first.slice(0, 3)) ? 0.9 : 0.74);
  }

  return Math.round(Math.min(1, best) * 100) / 100;
}

/**
 * Los correos verificados por el socio mandan.
 * Recuperaciones del Excel / cuarentena re-alineada: exigen coincidencia de identidad.
 * Correo nativo en ficha sin recovery ni cuarentena: se permite (claim lo corrige).
 */
export function isSafeCampaignMemberEmail(
  member: Pick<
    MemberDoc,
    "memberName" | "normalizedName" | "email" | "emailVerified" | "emailRecovery" | "emailQuarantine"
  >,
) {
  if (!member.email || member.emailQuarantine) return false;
  if (member.emailVerified === true) return true;
  const score = memberEmailNameScore(
    member.email,
    member.memberName || member.normalizedName,
  );
  if (member.emailRecovery) {
    // Recuperados: score guardado o recálculo.
    const stored = Number(member.emailRecovery.score);
    const effective = Number.isFinite(stored) ? Math.max(stored, score) : score;
    return effective >= SAFE_EMAIL_NAME_SCORE;
  }
  // Nativo sin recovery: si el nombre choca fuerte, fuera de campañas.
  if (score > 0 && score < UNIQUE_OWNER_SCORE) return false;
  return true;
}

/** ¿Este correo merece reasignarse a esta ficha por nombre/apellidos? */
export function isNameEmailAlignable(
  email: unknown,
  memberName: unknown,
  options?: { uniqueOwner?: boolean },
) {
  const score = memberEmailNameScore(email, memberName);
  const threshold = options?.uniqueOwner ? UNIQUE_OWNER_SCORE : SAFE_EMAIL_NAME_SCORE;
  return { ok: score >= threshold, score };
}
