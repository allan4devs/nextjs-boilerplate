import { NextRequest, NextResponse } from "next/server";
import { absoluteAppUrl } from "@/lib/constants/app-url";
import { getDb } from "@/lib/helpers/mongodb";
import { verifyCampaignClickSignature } from "@/lib/xtreme/campaign-click";
import { markCampaignLinkOpened } from "@/lib/xtreme/campaign-delivery-status";
import {
  EMAIL_CAMPAIGN_DELIVERIES_COLLECTION,
} from "@/lib/xtreme/shared";
import { isUsableCampaignClaimPath } from "@/lib/xtreme/email-campaigns";

export const dynamic = "force-dynamic";

/**
 * Tracking de click en CTA de campaña masiva.
 * GET /api/xtreme/campaign-click?d=deliveryKey&s=signature
 * Marca openedAt y redirige al magic link real guardado en la delivery.
 */
export async function GET(req: NextRequest) {
  const deliveryKey = String(req.nextUrl.searchParams.get("d") || "").trim();
  const signature = String(req.nextUrl.searchParams.get("s") || "").trim();

  const fallback = absoluteAppUrl("/primer-dia#registro");

  if (!deliveryKey || !verifyCampaignClickSignature(deliveryKey, signature)) {
    return NextResponse.redirect(fallback, 302);
  }

  try {
    const db = await getDb();
    const delivery = await db.collection(EMAIL_CAMPAIGN_DELIVERIES_COLLECTION).findOne({
      deliveryKey,
    });

    await markCampaignLinkOpened(db, { deliveryKey }).catch(() => undefined);

    const ctaPath = String(delivery?.ctaPath || "").trim();
    // Solo redirigir a magic link real o rutas internas seguras.
    if (isUsableCampaignClaimPath(ctaPath)) {
      return NextResponse.redirect(absoluteAppUrl(ctaPath), 302);
    }
    if (ctaPath.startsWith("/") && !ctaPath.startsWith("//") && !ctaPath.startsWith("/registro/confirmar")) {
      return NextResponse.redirect(absoluteAppUrl(ctaPath), 302);
    }
    if (delivery?.linkKind === "app") {
      return NextResponse.redirect(absoluteAppUrl("/app"), 302);
    }
    return NextResponse.redirect(fallback, 302);
  } catch (error) {
    console.error("CAMPAIGN CLICK", error);
    return NextResponse.redirect(fallback, 302);
  }
}
