import { NextResponse } from "next/server";
import { getPayPalAccessToken, getPayPalApiBaseUrl } from "@/lib/helpers/paypal";

type CaptureBody = {
  orderID?: string;
};

type PayPalCaptureResponse = {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{ id?: string; status?: string }>;
    };
  }>;
};

export async function POST(req: Request) {
  try {
    const { orderID } = (await req.json()) as CaptureBody;

    if (!orderID?.trim()) {
      return NextResponse.json({ success: false, message: "Falta el número de orden PayPal." }, { status: 400 });
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
        { success: false, message: data.message || "No se pudo confirmar el pago." },
        { status: response.status || 500 },
      );
    }

    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

    return NextResponse.json({
      success: true,
      id: data.id,
      status: data.status,
      captureID: capture?.id ?? null,
      captureStatus: capture?.status ?? null,
    });
  } catch (error) {
    console.error("Xtreme checkout capture-order error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Error interno confirmando el pago." },
      { status: 500 },
    );
  }
}
