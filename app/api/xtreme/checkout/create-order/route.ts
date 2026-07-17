import { NextRequest, NextResponse } from "next/server";
import { PAYPAL_CURRENCY } from "@/lib/constants/paypal";
import { getPayPalAccessToken, getPayPalApiBaseUrl } from "@/lib/helpers/paypal";
import { getDb } from "@/lib/helpers/mongodb";
import { recordEvent } from "@/lib/xtreme/events";
import { isSession, requireMemberSession } from "@/lib/xtreme/session";
import {
  MEMBERS_COLLECTION,
  PAYPAL_ORDERS_COLLECTION,
  type MemberDoc,
  normalizeKey,
  normalizeName,
} from "@/lib/xtreme/shared";
import { getXtremeCheckoutOption, isFreeOption } from "../catalog";

export type PendingPayPalOrder = {
  orderId: string;
  optionId: string;
  amountUsd: string;
  currency: string;
  memberKey: string;
  customer: {
    name: string;
    phone: string;
    email: string;
    date?: string;
    time?: string;
    goal?: string;
  };
  status: "created" | "captured" | "failed";
  createdAt: Date;
  capturedAt?: Date;
  paypalCaptureId?: string | null;
  authenticatedMemberKey?: string;
  source?: "site" | "member_app";
};

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
  memberCheckout?: boolean;
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
  const email = clean(customer.email);

  return {
    address: {
      country_code: "CR",
    },
    ...(email ? { email_address: email } : {}),
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateOrderBody;
    const option = getXtremeCheckoutOption(body.optionId);
    let customer = body.customer ?? {};
    let authenticatedMemberKey = "";

    if (!option) {
      return NextResponse.json({ success: false, message: "Seleccione un plan o clase válido." }, { status: 400 });
    }

    // All catalog options are paid; reject zero-price ids if any slip through.
    if (isFreeOption(option)) {
      return NextResponse.json(
        { success: false, message: "Esta opción no admite pago. Elija un plan o clase de pago." },
        { status: 400 },
      );
    }

    const db = await getDb();
    if (body.memberCheckout) {
      const session = await requireMemberSession(req);
      if (!isSession(session)) return session;
      const member = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({
        normalizedName: session.memberKey,
      });
      if (!member) {
        return NextResponse.json(
          { success: false, message: "No encontramos el perfil de esta sesión." },
          { status: 404 },
        );
      }
      authenticatedMemberKey = session.memberKey;
      customer = {
        name: member.memberName || session.memberName,
        phone: member.phone || "",
        email: member.email || "",
        goal: member.goal || "",
      };
    }

    if (!clean(customer.name) || (!body.memberCheckout && (!clean(customer.phone) || !clean(customer.email)))) {
      return NextResponse.json(
        { success: false, message: "Nombre, teléfono y correo son requeridos para pagar." },
        { status: 400 },
      );
    }

    const memberKey = authenticatedMemberKey || normalizeKey(normalizeName(customer.name));
    const usdAmount = option.usdAmount;
    const priceCrc = option.priceCrc;
    const priceLabel = option.priceLabel;

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
              value: usdAmount,
            },
            description: `Xtreme Gym - ${option.label} (${priceLabel})`,
            custom_id: createCustomId(option.id, customer),
          },
        ],
      }),
    });

    const data = (await response.json()) as PayPalCreateOrderResponse & { message?: string };

    if (!response.ok || !data.id) {
      console.error("Xtreme PayPal create order error:", { status: response.status, data });
      return NextResponse.json(
        { success: false, message: data.message || "No se pudo crear la orden de pago en línea." },
        { status: response.status || 500 },
      );
    }

    const pending: PendingPayPalOrder = {
      orderId: data.id,
      optionId: option.id,
      amountUsd: String(usdAmount),
      currency: PAYPAL_CURRENCY,
      memberKey,
      customer: {
        name: clean(customer.name),
        phone: clean(customer.phone),
        email: clean(customer.email),
        date: clean(customer.date) || undefined,
        time: clean(customer.time) || undefined,
        goal: clean(customer.goal) || undefined,
      },
      status: "created",
      createdAt: new Date(),
      authenticatedMemberKey: authenticatedMemberKey || undefined,
      source: body.memberCheckout ? "member_app" : "site",
    };

    await db.collection<PendingPayPalOrder>(PAYPAL_ORDERS_COLLECTION).updateOne(
      { orderId: data.id },
      { $set: pending },
      { upsert: true },
    );

    await recordEvent(db, {
      type: "checkout_started",
      memberId: memberKey,
      source: body.memberCheckout ? "member_app" : "site",
      entity: { type: "paypal_order", id: data.id },
      properties: {
        optionId: option.id,
        amountUsd: Number(usdAmount),
        priceCrc,
      },
    });

    return NextResponse.json({
      success: true,
      orderID: data.id,
      amount: usdAmount,
      currency: PAYPAL_CURRENCY,
      option: { ...option, priceCrc, usdAmount, priceLabel },
    });
  } catch (error) {
    console.error("Xtreme checkout create-order error:", error);
    return NextResponse.json(
      { success: false, message: "Error interno creando el pago." },
      { status: 500 },
    );
  }
}
