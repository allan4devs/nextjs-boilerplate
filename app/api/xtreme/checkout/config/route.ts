import { NextResponse } from "next/server";
import { PAYPAL_CURRENCY } from "@/lib/constants/paypal";

function isLivePayPalMode() {
  const mode = (process.env.PAYPAL_MODE || process.env.NEXT_PUBLIC_PAYPAL_MODE)?.trim().toLowerCase();
  return mode === "live" || mode === "production" || mode === "prod";
}

function isPlaceholder(value: string | undefined) {
  if (!value) return true;
  const v = value.toLowerCase();
  return v.startsWith("your-") || v.includes("example") || v === "changeme";
}

/** Public client id for the PayPal JS SDK (browser). */
function getClientId() {
  const live =
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() || process.env.PAYPAL_CLIENT_ID?.trim();
  const sandbox =
    process.env.NEXT_PUBLIC_PAYPAL_SANDBOX_CLIENT_ID?.trim() ||
    process.env.PAYPAL_SANDBOX_CLIENT_ID?.trim();

  // Prefer the mode-specific id, but fall back so one set of credentials still works.
  const clientId = isLivePayPalMode() ? live || sandbox : sandbox || live;
  return clientId && !isPlaceholder(clientId) ? clientId : undefined;
}

export async function GET() {
  const clientId = getClientId();

  if (!clientId) {
    return NextResponse.json({
      configured: false,
      message:
        "El pago en línea no está listo. Configure las credenciales de checkout en el servidor.",
      currency: PAYPAL_CURRENCY,
    });
  }

  return NextResponse.json({
    configured: true,
    clientId,
    currency: PAYPAL_CURRENCY,
  });
}
