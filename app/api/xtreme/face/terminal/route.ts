/**
 * Puente terminal física de rostro → ingresos de Xtreme.
 *
 * GET   → estado de la integración (habilitada, configurada, host).
 * POST  → corre una pasada: lee el equipo, resuelve cada rostro a un socio y
 *         registra el ingreso. Body `{ dryRun: true }` solo previsualiza.
 *
 * Exige sesión de staff de recepción: dispara ingresos reales contra el padrón.
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import {
  FACE_TERMINAL_ENABLED,
  FACE_TERMINAL_HOST,
  isFaceTerminalConfigured,
} from "@/lib/xtreme/face/terminal";
import { syncTerminalScans } from "@/lib/xtreme/face/terminal-sync";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const session = await resolveStaffSession(req, "reception");
  if (!session) return unauthorized();

  return NextResponse.json({
    enabled: FACE_TERMINAL_ENABLED,
    configured: isFaceTerminalConfigured(),
    host: FACE_TERMINAL_HOST,
  });
}

export async function POST(req: NextRequest) {
  const session = await resolveStaffSession(req, "reception");
  if (!session) return unauthorized();

  if (!isFaceTerminalConfigured()) {
    return NextResponse.json(
      {
        error:
          "Terminal de rostro no configurada. Cargá XTREME_FACE_TERMINAL_ENABLED=1 y la contraseña en el entorno.",
      },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
    const db = await getDb();
    const result = await syncTerminalScans(db, { dryRun: Boolean(body.dryRun) });
    // El resultado ya trae ok:false + deviceError si el equipo falló; se devuelve
    // 200 igual, con el detalle adentro, para que recepción vea el motivo.
    return NextResponse.json(result);
  } catch (err) {
    console.error("XTREME FACE TERMINAL POST", err);
    return NextResponse.json(
      { error: "No se pudo sincronizar con la terminal de rostro." },
      { status: 500 },
    );
  }
}
