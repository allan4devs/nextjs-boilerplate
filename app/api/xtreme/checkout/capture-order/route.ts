import { NextResponse } from "next/server";
import { getPayPalAccessToken, getPayPalApiBaseUrl } from "@/lib/helpers/paypal";
import { getDb } from "@/lib/helpers/mongodb";
import {
  sendPaymentAppInviteEmail,
  sendPaymentReceiptEmail,
} from "@/lib/helpers/email";
import { recordEvent } from "@/lib/xtreme/events";
import { getXtremeCheckoutOption } from "../catalog";
import type { PendingPayPalOrder } from "../create-order/route";
import {
  MEMBERS_COLLECTION,
  PAYMENTS_COLLECTION,
  PAYPAL_ORDERS_COLLECTION,
  PENDING_REGISTRATIONS_COLLECTION,
  type MemberDoc,
  type PendingRegistrationDoc,
  type PaymentDoc,
  addDays,
  isValidEmail,
  membershipStatus,
  normalizeEmail,
  normalizeKey,
  normalizeName,
  todayIso,
  toUtcDate,
} from "@/lib/xtreme/shared";
import {
  entitlementFromPayment,
  grantEntitlement,
  type EntitlementDoc,
} from "@/lib/xtreme/entitlements";
import { bookSession } from "@/lib/xtreme/inventory";
import {
  createRegistrationToken,
  hashRegistrationToken,
} from "@/lib/xtreme/registration-token";

type CaptureBody = {
  orderID?: string;
  /** Ignored for grants — option comes from pending order created at checkout. */
  optionId?: string;
  /** Optional class hold — capture creates booking after entitlement grant. */
  trainingId?: string;
  trainingName?: string;
  trainingDate?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
    date?: string;
    time?: string;
    goal?: string;
  };
};

function amountsMatch(captured: string | undefined, expected: string) {
  const a = Number(captured);
  const b = Number(expected);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) < 0.02;
}

type PayPalCaptureResponse = {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    amount?: { value?: string; currency_code?: string };
    custom_id?: string;
    description?: string;
    payments?: {
      captures?: Array<{ id?: string; status?: string; amount?: { value?: string; currency_code?: string } }>;
    };
  }>;
  payer?: {
    email_address?: string;
    name?: { given_name?: string; surname?: string };
  };
};

function planDays(optionId: string) {
  switch (optionId) {
    case "day-pass":
      return 1;
    case "week":
      return 7;
    case "fortnight":
      return 15;
    case "month":
      return 30;
    case "senior":
      return 30;
    default:
      return 30;
  }
}

const APP_INVITE_EXPIRES_HOURS = 24;

async function sendAppInviteAfterPayment(
  db: Awaited<ReturnType<typeof getDb>>,
  payment: PaymentDoc,
) {
  if (!payment.email) return false;
  try {
    const paidMember = await db
      .collection<MemberDoc>(MEMBERS_COLLECTION)
      .findOne({ normalizedName: payment.normalizedName });
    if (!paidMember || (paidMember.cedula && paidMember.emailVerified)) return false;

    const token = createRegistrationToken();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + APP_INVITE_EXPIRES_HOURS * 60 * 60 * 1000,
    );
    await db
      .collection<PendingRegistrationDoc>(PENDING_REGISTRATIONS_COLLECTION)
      .updateOne(
        { email: payment.email },
        {
          $set: {
            email: payment.email,
            tokenHash: hashRegistrationToken(token),
            expiresAt,
            confirmedAt: null,
            memberNormalizedName: null,
            expectedMemberKey: payment.normalizedName,
            expectedMemberName: payment.memberName,
            paymentId: payment.id,
            source: "paypal",
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );

    const invite = await sendPaymentAppInviteEmail({
      to: payment.email,
      token,
      memberName: payment.memberName,
      optionLabel: payment.optionLabel,
      expiresHours: APP_INVITE_EXPIRES_HOURS,
    });
    return invite.ok;
  } catch (inviteError) {
    console.error("Xtreme PayPal app invite error:", inviteError);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CaptureBody;
    const { orderID } = body;

    if (!orderID?.trim()) {
      return NextResponse.json({ success: false, message: "Falta el número de orden PayPal." }, { status: 400 });
    }

    const db = await getDb();
    const pending = await db.collection<PendingPayPalOrder>(PAYPAL_ORDERS_COLLECTION).findOne({
      orderId: orderID.trim(),
    });
    if (!pending) {
      return NextResponse.json(
        { success: false, message: "Orden no encontrada. Vuelva a iniciar el pago." },
        { status: 400 },
      );
    }

    // Resolve catalog option only from the server-side pending order (not client body).
    const option = getXtremeCheckoutOption(pending.optionId);
    if (!option) {
      return NextResponse.json(
        { success: false, message: "Plan de la orden invalido. Contacte recepcion." },
        { status: 400 },
      );
    }

    if (pending.status === "captured" && pending.paypalCaptureId) {
      const existingPay = await db.collection<PaymentDoc>(PAYMENTS_COLLECTION).findOne({
        paypalCaptureId: pending.paypalCaptureId,
      });
      if (existingPay) {
        const appInviteSent = await sendAppInviteAfterPayment(db, existingPay);
        return NextResponse.json({
          success: true,
          id: orderID,
          captureID: pending.paypalCaptureId,
          paymentId: existingPay.id,
          appInviteSent,
          idempotent: true,
        });
      }
    }

    const accessToken = await getPayPalAccessToken();
    const response = await fetch(`${getPayPalApiBaseUrl()}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = (await response.json()) as PayPalCaptureResponse & { message?: string };

    if (!response.ok) {
      console.error("Xtreme PayPal capture error:", { status: response.status, data, orderID });
      return NextResponse.json(
        { success: false, message: "No se pudo confirmar el pago." },
        { status: response.status || 500 },
      );
    }

    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    const captureStatus = (capture?.status || data.status || "").toUpperCase();
    if (captureStatus && captureStatus !== "COMPLETED" && data.status !== "COMPLETED") {
      return NextResponse.json(
        { success: false, message: "El pago no se completo en PayPal." },
        { status: 402 },
      );
    }

    const capturedAmount = capture?.amount?.value || data.purchase_units?.[0]?.amount?.value;
    if (!amountsMatch(capturedAmount, pending.amountUsd)) {
      console.error("Xtreme PayPal amount mismatch", {
        orderID,
        captured: capturedAmount,
        expected: pending.amountUsd,
      });
      return NextResponse.json(
        { success: false, message: "Monto del pago no coincide. Contacte recepcion." },
        { status: 400 },
      );
    }

    const submittedCustomerName =
      normalizeName(pending.customer.name || body.customer?.name) ||
      [data.payer?.name?.given_name, data.payer?.name?.surname].filter(Boolean).join(" ") ||
      "Cliente PayPal";
    const amountUsd = Number(pending.amountUsd);
    const amountCrc = option.priceCrc;
    const now = new Date();
    const paypalEmail = normalizeEmail(data.payer?.email_address);
    const checkoutEmail = normalizeEmail(pending.customer.email || body.customer?.email);
    const paymentEmail = isValidEmail(paypalEmail)
      ? paypalEmail
      : isValidEmail(checkoutEmail)
        ? checkoutEmail
        : "";
    // Solo un correo devuelto por PayPal puede alinear automaticamente un pago
    // con un perfil existente. El correo escrito en el formulario debe probarse
    // despues mediante el enlace de un solo uso.
    const linkedMember = isValidEmail(paypalEmail)
      ? await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({
          email: paypalEmail,
          emailVerified: true,
        })
      : null;
    const customerName = normalizeName(linkedMember?.memberName) || submittedCustomerName;
    const normalizedName =
      normalizeKey(linkedMember?.normalizedName || customerName) || pending.memberKey;

    const payment: PaymentDoc = {
      id: `pay-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
      memberName: customerName,
      normalizedName,
      customerName,
      phone: String(pending.customer.phone || body.customer?.phone || "").trim().slice(0, 40),
      email: paymentEmail,
      optionId: option.id,
      optionLabel: option.label,
      category: option.category,
      amountCrc,
      amountUsd,
      currency: capture?.amount?.currency_code || pending.currency || "USD",
      method: "paypal",
      status: "completed",
      paypalOrderId: data.id ?? orderID,
      paypalCaptureId: capture?.id ?? null,
      note:
        pending.customer.goal || body.customer?.goal
          ? `Objetivo: ${String(pending.customer.goal || body.customer?.goal).slice(0, 120)}`
          : "",
      date: todayIso(),
      createdAt: now,
      recordedBy: "paypal",
    };

    let membershipUntil: string | undefined;
    let entitlement: EntitlementDoc | null = null;
    let bookingId: string | null = null;
    try {
      // Idempotent payment insert (retry-safe on paypalCaptureId when present)
      if (payment.paypalCaptureId) {
        const existingPay = await db.collection<PaymentDoc>(PAYMENTS_COLLECTION).findOne({
          paypalCaptureId: payment.paypalCaptureId,
        });
        if (existingPay) {
          await db.collection(PAYPAL_ORDERS_COLLECTION).updateOne(
            { orderId: orderID.trim() },
            {
              $set: {
                status: "captured",
                capturedAt: now,
                paypalCaptureId: payment.paypalCaptureId,
              },
            },
          );
          const appInviteSent = await sendAppInviteAfterPayment(db, existingPay);
          return NextResponse.json({
            success: true,
            id: data.id,
            status: data.status,
            captureID: payment.paypalCaptureId,
            paymentId: existingPay.id,
            appInviteSent,
            idempotent: true,
          });
        }
      }

      await db.collection<PaymentDoc>(PAYMENTS_COLLECTION).insertOne(payment);
      await db.collection(PAYPAL_ORDERS_COLLECTION).updateOne(
        { orderId: orderID.trim() },
        {
          $set: {
            status: "captured",
            capturedAt: now,
            paypalCaptureId: payment.paypalCaptureId,
          },
        },
      );
      await recordEvent(db, {
        type: "payment_completed",
        memberId: normalizedName,
        source: "paypal",
        entity: { type: "payment", id: payment.id },
        properties: { optionId: payment.optionId, amountCrc, amountUsd, currency: payment.currency },
      });

      // Activar / extender membresia del socio si es plan
      if (option.category === "Plan" || option.id === "day-pass" || option.id === "senior") {
        const days = planDays(option.id);
        const existing = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne({ normalizedName });
        const base =
          existing?.membership?.nextBillingDate && existing.membership.nextBillingDate > todayIso()
            ? existing.membership.nextBillingDate
            : todayIso();
        const nextBillingDate = addDays(toUtcDate(base), days).toISOString().slice(0, 10);
        membershipUntil = nextBillingDate;
        const planLabel = option.label ?? existing?.membership?.plan ?? "Xtreme Mensual";
        const startedAt = existing?.membership?.startedAt ?? todayIso();
        const isRenewal = Boolean(existing?.membership?.nextBillingDate);

        await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
          { normalizedName },
          {
            $set: {
              normalizedName,
              memberName: customerName,
              phone: payment.phone || existing?.phone || "",
              email: payment.email || existing?.email || "",
              goal: String(pending.customer.goal ?? body.customer?.goal ?? existing?.goal ?? "")
                .trim()
                .slice(0, 80),
              membership: {
                plan: planLabel,
                nextBillingDate,
                startedAt,
                status: membershipStatus({ plan: planLabel, nextBillingDate, startedAt }).status,
              },
              updatedAt: now,
            },
            $setOnInsert: {
              workouts: [],
              bodyMetrics: [],
              favoriteTraining: "",
              createdAt: now,
            },
          },
          { upsert: true },
        );

        const entShape = entitlementFromPayment({
          memberKey: normalizedName,
          optionId: option.id,
          optionLabel: planLabel,
          paymentId: payment.id,
          startDate: todayIso(),
          category: option.category,
        });
        if (entShape.kind === "plan") {
          entShape.endsOn = nextBillingDate;
        }
        entitlement = await grantEntitlement(db, entShape);
        membershipUntil = entitlement.endsOn;

        const lifecycleType =
          option.id === "day-pass"
            ? existing
              ? "payment_completed"
              : "membership_started"
            : isRenewal
              ? "renewal_completed"
              : "membership_started";

        if (lifecycleType !== "payment_completed") {
          await recordEvent(db, {
            type: lifecycleType,
            memberId: normalizedName,
            source: "paypal",
            entity: { type: "payment", id: payment.id },
            properties: {
              optionId: payment.optionId,
              nextBillingDate: entitlement.endsOn,
              entitlementId: entitlement.id,
            },
          });
        }

        const trainingId = String(body.trainingId ?? "").trim();
        const trainingName = String(body.trainingName ?? "").trim();
        const trainingDate = String(body.trainingDate ?? todayIso()).slice(0, 10);
        if (trainingId && trainingName) {
          const booked = await bookSession(db, {
            memberKey: normalizedName,
            memberName: customerName,
            trainingId,
            trainingName,
            date: trainingDate,
            paymentId: payment.id,
            forceEntitlementId: entitlement.id,
          });
          if (booked.ok) {
            bookingId = booked.booking.id;
            await recordEvent(db, {
              type: "first_class_reserved",
              memberId: normalizedName,
              source: "paypal",
              entity: { type: "booking", id: booked.booking.id },
              properties: { trainingId, trainingDate, sessionId: booked.session.id },
            });
          }
        }
      }
    } catch (persistErr) {
      console.error("Xtreme payment persist error:", persistErr);
      // Capture already happened at PayPal — surface ops alert via logs.
    }

    const appInviteSent = await sendAppInviteAfterPayment(db, payment);
    if (payment.email) {
      await sendPaymentReceiptEmail({
        to: payment.email,
        customerName,
        optionLabel: payment.optionLabel,
        amountCrc: payment.amountCrc,
        amountUsd: payment.amountUsd,
        method: "paypal",
        date: payment.date,
        reference: payment.paypalCaptureId,
        nextBillingDate: membershipUntil,
      });
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      status: data.status,
      captureID: capture?.id ?? null,
      captureStatus: capture?.status ?? null,
      paymentId: payment.id,
      entitlementId: entitlement?.id ?? null,
      bookingId,
      membershipUntil: membershipUntil ?? null,
      appInviteSent,
    });
  } catch (error) {
    console.error("Xtreme checkout capture-order error:", error);
    return NextResponse.json(
      { success: false, message: "Error interno confirmando el pago." },
      { status: 500 },
    );
  }
}
