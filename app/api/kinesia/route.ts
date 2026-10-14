import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { MEMBERS_COLLECTION } from "@/lib/xtreme/shared";
import { resolveMemberSession } from "@/lib/xtreme/session";

export const dynamic = "force-dynamic";

const FALLBACK_API_URL = "https://api.kinesiaapp.com";

function errorRedirect(req: NextRequest, message: string) {
  const url = new URL("/app", req.nextUrl.origin);
  url.searchParams.set("partner_error", message.slice(0, 180));
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const session = await resolveMemberSession(req, true);
  if (!session) return errorRedirect(req, "Tu sesión de socio venció. Ingresá de nuevo.");

  const integrationCode = process.env.KINESIA_CODIGO_INTEGRACION?.trim();
  if (!integrationCode) return errorRedirect(req, "Kinesia todavía no está configurada en Xtreme.");

  const db = await getDb();
  const member = await db.collection(MEMBERS_COLLECTION).findOne(
    { normalizedName: session.memberKey },
    { projection: { memberName: 1, cedula: 1, email: 1 } },
  );
  const cedula = String(member?.cedula ?? "").replace(/\D/g, "");
  const email = String(member?.email ?? "").trim().toLowerCase();
  if (!cedula || !email) return errorRedirect(req, "Completá tu cédula y correo en Perfil para entrar a Kinesia.");

  const apiUrl = (process.env.KINESIA_API_URL?.trim() || FALLBACK_API_URL).replace(/\/$/, "");
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/integraciones/v1/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cedula, codigoIntegracion: integrationCode, nombre: member?.memberName ?? session.memberName, email }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return errorRedirect(req, "Kinesia no respondió. Intentá de nuevo en un momento.");
  }

  const data = (await response.json().catch(() => ({}))) as { url?: unknown; error?: { message?: unknown } };
  if (!response.ok || typeof data.url !== "string" || !/^https:\/\//i.test(data.url)) {
    const message = typeof data.error?.message === "string" ? data.error.message : "Kinesia no pudo iniciar tu sesión.";
    return errorRedirect(req, message);
  }
  return NextResponse.redirect(data.url);
}
