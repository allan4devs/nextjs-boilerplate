import { NextResponse } from "next/server";
import { PAYPAL_CURRENCY } from "@/lib/constants/paypal";
import { getPayPalAccessToken, getPayPalApiBaseUrl } from "@/lib/helpers/paypal";
import { getDb } from "@/lib/helpers/mongodb";
import { recordEvent } from "@/lib/xtreme/events";
import { normalizeKey, normalizeName } from "@/lib/xtreme/shared";
import { getXtremeCheckoutOption } from "../catalog";

type Customer = {
  name?: string;
  phone?: string;
  email?: string;
  date?: string;
  time?: string;
  goal?: string;
};

type CreateOrderBody = {
  optionId?: string;
  customer?: Customer;
};

type PayPalCreateOrderResponse = {
  id?: string;
  links?: Array<{ rel?: string; href?: string }>;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function createCustomId(optionId: string, customer: Customer) {
  const payload = JSON.stringify({
    source: "xtreme-gym-landing",
    optionId,
    name: clean(customer.name).slice(0, 48),
    phone: clean(customer.phone).slice(0, 24),
    email: clean(customer.email).slice(0, 64),
    date: clean(customer.date).slice(0, 16),
    time: clean(customer.time).slice(0, 32),
  });

  return payload.length <= 127 ? payload : JSON.stringify({ source: "xtreme", optionId });
}

function createPayer(customer: Customer) {
  const name = clean(customer.name).replace(/\s+/g, " ");
  const parts = name.split(" ").filter(Boolean);
  const nationalPhone = clean(customer.phone).replace(/^\+\d{1,3}\s*/, "").replace(/\D/g, "");

  return {
    email_address: clean(customer.email),
    address: {
      country_code: "CR",
    },
    ...(parts[0] && parts.length > 1
      ? {
          name: {
            given_name: parts[0],
            surname: parts.slice(1).join(" "),
          },
        }
      : {}),
    ...(nationalPhone
      ? {
          phone: {
            phone_type: "MOBILE",
            phone_number: {
              national_number: nationalPhone,
            },
          },
        }
      : {}),
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateOrderBody;
    const option = getXtremeCheckoutOption(body.optionId);
    const customer = body.customer ?? {};

    if (!option) {
      return NextResponse.json({ success: false, message: "Seleccione un plan o clase válido." }, { status: 400 });
    }

    if (!clean(customer.name) || !clean(customer.phone) || !clean(customer.email)) {
      return NextResponse.json(
        { success: false, message: "Nombre, teléfono y correo son requeridos para pagar." },
        { status: 400 },
      );
    }

    const accessToken = await getPayPalAccessToken();
    const response = await fetch(`${getPayPalApiBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        payer: createPayer(customer),
        purchase_units: [
          {
            amount: {
              currency_code: PAYPAL_CURRENCY,
              value: option.usdAmount,
            },
            description: `Xtreme Gym - ${option.label} (${option.priceLabel})`,
            custom_id: createCustomId(option.id, customer),
          },
        ],
      }),
    });

    const data = (await response.json()) as PayPalCreateOrderResponse & { message?: string };

    if (!response.ok || !data.id) {
      console.error("Xtreme PayPal create order error:", { status: response.status, data });
      return NextResponse.json(
        { success: false, message: data.message || "No se pudo crear la orden de PayPal." },
        { status: response.status || 500 },
      );
    }

    const db = await getDb();
    await recordEvent(db, {
      type: "checkout_started",
      memberId: normalizeKey(normalizeName(customer.name)),
      source: "site",
      entity: { type: "paypal_order", id: data.id },
      properties: { optionId: option.id, amountUsd: Number(option.usdAmount), priceCrc: option.priceCrc },
    });

    return NextResponse.json({
      success: true,
      orderID: data.id,
      amount: option.usdAmount,
      currency: PAYPAL_CURRENCY,
      option,
    });
  } catch (error) {
    console.error("Xtreme checkout create-order error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Error interno creando el pago." },
      { status: 500 },
    );
  }
}
