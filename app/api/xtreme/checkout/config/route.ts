import { NextResponse } from "next/server";
import { PAYPAL_CURRENCY } from "@/lib/constants/paypal";

function isLivePayPalMode() {
  // Espeja la reserva: el server usa PAYPAL_MODE y el cliente NEXT_PUBLIC_PAYPAL_MODE.
  // Tomamos cualquiera de los dos para funcionar en el mismo entorno que la reserva.
  const mode = (process.env.PAYPAL_MODE || process.env.NEXT_PUBLIC_PAYPAL_MODE)?.trim().toLowerCase();
  return mode === "live" || mode === "production" || mode === "prod";
}

function getClientId() {
  if (isLivePayPalMode()) {
    return process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() || process.env.PAYPAL_CLIENT_ID?.trim();
  }

  return process.env.NEXT_PUBLIC_PAYPAL_SANDBOX_CLIENT_ID?.trim() || process.env.PAYPAL_SANDBOX_CLIENT_ID?.trim();
}

export async function GET() {
  const clientId = getClientId();

  if (!clientId || clientId.toLowerCase().startsWith("your-")) {
    return NextResponse.json({
      configured: false,
      message: "PayPal no está configurado para Xtreme Gym.",
      currency: PAYPAL_CURRENCY,
    });
  }

  return NextResponse.json({
    configured: true,
    clientId,
    currency: PAYPAL_CURRENCY,
  });
}
