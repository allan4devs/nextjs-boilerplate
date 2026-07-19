import { createHmac, timingSafeEqual } from "crypto";

function clickSecret() {
  return (
    process.env.CRON_SECRET?.trim() ||
    process.env.XTREME_ADMIN_CODE?.trim() ||
    "xtreme-campaign-click-v1"
  );
}

export function campaignClickSignature(deliveryKey: string) {
  return createHmac("sha256", clickSecret())
    .update(`campaign-click:${deliveryKey}`)
    .digest("base64url");
}

export function verifyCampaignClickSignature(deliveryKey: string, signature: string) {
  const expected = campaignClickSignature(deliveryKey);
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(String(signature || ""));
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Ruta de tracking del CTA: marca click y redirige al magic link real. */
export function campaignClickPath(deliveryKey: string) {
  const d = encodeURIComponent(deliveryKey);
  const s = encodeURIComponent(campaignClickSignature(deliveryKey));
  return `/api/xtreme/campaign-click?d=${d}&s=${s}`;
}
