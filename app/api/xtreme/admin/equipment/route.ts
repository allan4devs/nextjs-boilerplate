import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { writeAudit, diffFields } from "@/lib/xtreme/audit";
import {
  createEquipmentAsset,
  listEquipmentAssets,
  updateEquipmentAsset,
  type EquipmentArea,
  type EquipmentAssetDoc,
  type EquipmentAssetPatch,
  type EquipmentKind,
  type EquipmentStatus,
} from "@/lib/xtreme/equipment";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";
import { EQUIPMENT_ASSETS_COLLECTION } from "@/lib/xtreme/shared";

export const dynamic = "force-dynamic";

async function adminSession(req: NextRequest) {
  const session = await resolveStaffSession(req, "admin");
  return session?.role === "admin" || session?.role === "super" ? session : null;
}

function unauthorized() {
  return NextResponse.json({ error: "Sesión de admin requerida." }, { status: 401 });
}

const STRING_PATCH_FIELDS = [
  "name",
  "description",
  "location",
  "code",
  "brand",
  "serial",
  "supplier",
  "invoiceNumber",
  "depreciation",
  "maintenance",
  "warranty",
] as const;
const STRING_PATCH_LIMITS = {
  name: 140,
  description: 5000,
  location: 500,
  code: 32,
  brand: 200,
  serial: 200,
  supplier: 300,
  invoiceNumber: 200,
  depreciation: 2000,
  maintenance: 5000,
  warranty: 2000,
} satisfies Record<(typeof STRING_PATCH_FIELDS)[number], number>;
const NUMBER_PATCH_FIELDS = ["year", "cost"] as const;
const EQUIPMENT_STATUSES: EquipmentStatus[] = [
  "bueno",
  "fuera_de_servicio",
  "pendiente",
  "sin_dato",
];

function parseEquipmentPatch(body: Record<string, unknown>) {
  const patch: EquipmentAssetPatch = {};

  for (const field of STRING_PATCH_FIELDS) {
    const value = body[field];
    if (value === undefined) continue;
    if (typeof value !== "string") return { error: `${field} debe ser texto.` } as const;
    if (value.length > STRING_PATCH_LIMITS[field]) {
      return { error: `${field} supera el máximo de ${STRING_PATCH_LIMITS[field]} caracteres.` } as const;
    }
    patch[field] = value;
  }
  for (const field of NUMBER_PATCH_FIELDS) {
    const value = body[field];
    if (value === undefined) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { error: `${field} debe ser un número válido.` } as const;
    }
    patch[field] = value;
  }
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !EQUIPMENT_STATUSES.includes(body.status as EquipmentStatus)) {
      return { error: "Estado de equipo inválido." } as const;
    }
    patch.status = body.status as EquipmentStatus;
  }
  if (patch.name !== undefined && !patch.name.trim()) {
    return { error: "El nombre del activo no puede quedar vacío." } as const;
  }
  if (!Object.keys(patch).length) {
    return { error: "No hay campos editables para actualizar." } as const;
  }
  return { patch } as const;
}

export async function GET(req: NextRequest) {
  const session = await adminSession(req);
  if (!session) return unauthorized();

  const db = await getDb();
  const area = (req.nextUrl.searchParams.get("area") as EquipmentArea | null) ?? undefined;
  const kind = (req.nextUrl.searchParams.get("kind") as EquipmentKind | null) ?? undefined;
  const status = (req.nextUrl.searchParams.get("status") as EquipmentStatus | null) ?? undefined;

  const assets = await listEquipmentAssets(db, {
    area: area ?? undefined,
    kind: kind ?? undefined,
    status: status ?? undefined,
  });
  return NextResponse.json({ assets });
}

export async function PATCH(req: NextRequest) {
  const session = await adminSession(req);
  if (!session) return unauthorized();

  let rawBody: unknown;
  try {
    rawBody = (await req.json()) as unknown;
  } catch {
    return NextResponse.json({ error: "El JSON de la solicitud es inválido." }, { status: 400 });
  }
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const body = rawBody as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "Falta el id del activo." }, { status: 400 });

  const parsed = parseEquipmentPatch(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const db = await getDb();
  const collection = db.collection<EquipmentAssetDoc>(EQUIPMENT_ASSETS_COLLECTION);
  const before = await collection.findOne({ id });
  if (!before) return NextResponse.json({ error: "Activo no encontrado." }, { status: 404 });

  const { patch } = parsed;
  const updated = await updateEquipmentAsset(db, id, patch);
  if (!updated) return NextResponse.json({ error: "No se pudo actualizar el activo." }, { status: 500 });

  const changes = diffFields(before as Record<string, unknown>, patch as Record<string, unknown>);
  if (changes.length) {
    await writeAudit(db, {
      actorRole: session.role,
      actorId: session.staffId,
      actorName: session.staffName,
      action: "equipment_asset_updated",
      targetType: "system",
      targetId: id,
      summary: `Actualizó el activo ${before.name ?? id}`,
      changes,
    });
  }

  return NextResponse.json({ asset: updated });
}

export async function PUT(req: NextRequest) {
  const session = await adminSession(req);
  if (!session) return unauthorized();

  const body = (await req.json()) as {
    area?: EquipmentArea;
    kind?: EquipmentKind;
    name?: string;
    code?: string;
    description?: string;
    location?: string;
    status?: EquipmentStatus;
    machineGuideId?: string;
  };
  if (!body.area || !body.kind || !body.name?.trim()) {
    return NextResponse.json({ error: "Área, tipo y nombre son requeridos." }, { status: 400 });
  }

  const db = await getDb();
  const asset = await createEquipmentAsset(db, {
    area: body.area,
    kind: body.kind,
    name: body.name,
    code: body.code,
    description: body.description,
    location: body.location,
    status: body.status,
    machineGuideId: body.machineGuideId,
  });

  await writeAudit(db, {
    actorRole: session.role,
    actorId: session.staffId,
    actorName: session.staffName,
    action: "equipment_asset_created",
    targetType: "system",
    targetId: asset.id,
    summary: `Dio de alta el activo ${asset.name}`,
  });

  return NextResponse.json({ asset });
}
