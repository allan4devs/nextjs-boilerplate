import type { MemberDoc } from "@/lib/xtreme/shared";

export const SAFE_EMAIL_NAME_SCORE = 0.72;

function fold(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CR");
}

function nameTokens(value: unknown) {
  return fold(value).split(/[^a-z0-9]+/).filter((token) => token.length >= 3 && token !== "nulo");
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

/** Compara el usuario del correo con nombre y apellidos; nunca usa el dominio. */
export function memberEmailNameScore(emailValue: unknown, memberName: unknown) {
  const local = fold(String(emailValue ?? "").split("@")[0]).replace(/[^a-z]/g, "");
  const tokens = nameTokens(memberName);
  if (!local || !tokens.length) return 0;
  const variants = new Set([
    ...tokens,
    `${tokens[0] ?? ""}${tokens.at(-1) ?? ""}`,
    tokens.slice(0, 2).join(""),
    tokens.slice(-2).join(""),
    tokens.join(""),
  ]);
  let best = 0;
  for (const variant of variants) {
    if (!variant) continue;
    const ratio = Math.min(local.length, variant.length) / Math.max(local.length, variant.length);
    if (local.includes(variant) || variant.includes(local)) best = Math.max(best, ratio);
    best = Math.max(best, 1 - levenshtein(local, variant) / Math.max(local.length, variant.length));
  }
  const hits = tokens.filter((token) => local.includes(token)).length;
  if (hits >= 2) best = Math.max(best, 0.96);
  else if (hits === 1) best = Math.max(best, SAFE_EMAIL_NAME_SCORE);
  return Math.round(best * 100) / 100;
}

/**
 * Los correos verificados por el socio mandan. Para recuperaciones automáticas
 * del Excel se exige una coincidencia de identidad conservadora.
 */
export function isSafeCampaignMemberEmail(member: Pick<
  MemberDoc,
  "memberName" | "normalizedName" | "email" | "emailVerified" | "emailRecovery" | "emailQuarantine"
>) {
  if (!member.email || member.emailQuarantine) return false;
  if (member.emailVerified === true) return true;
  if (!member.emailRecovery) return true;
  return memberEmailNameScore(
    member.email,
    member.memberName || member.normalizedName,
  ) >= SAFE_EMAIL_NAME_SCORE;
}
