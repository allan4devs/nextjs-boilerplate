import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { RECEPTION_DUTIES_COLLECTION } from "@/lib/xtreme/shared";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";

export const dynamic = "force-dynamic";

type DutyKind = "responsibility" | "daily" | "monthly";

type DutyDoc = {
  id: string;
  kind: DutyKind;
  title: string;
  description: string;
  area: string;
  order: number;
  completedPeriods?: string[];
};

const DEFAULT_DUTIES: Omit<DutyDoc, "completedPeriods">[] = [
  { id: "resp-caja", kind: "responsibility", area: "Caja y pagos", order: 10, title: "Custodiar caja y medios de pago", description: "Manejar efectivo, tarjeta y SINPE; documentar diferencias y entregar el dinero." },
  { id: "resp-servicio", kind: "responsibility", area: "Atención al cliente", order: 20, title: "Atender socios y consultas", description: "Orientar sobre membresías, VIP, entrenamientos, InBody y bronceado." },
  { id: "resp-facturacion", kind: "responsibility", area: "Facturación", order: 30, title: "Controlar documentos electrónicos", description: "Administrar el correo, confirmar XML ante Hacienda y archivar comprobantes." },
  { id: "resp-inventario", kind: "responsibility", area: "Inventario y compras", order: 40, title: "Controlar inventario y proveedores", description: "Revisar existencias, hacer pedidos, recibir mercadería y actualizar costos." },
  { id: "resp-rrhh", kind: "responsibility", area: "Recursos Humanos", order: 50, title: "Apoyar la gestión de colaboradores", description: "Preparar planillas, altas, bajas, incapacidades y permisos." },
  { id: "resp-ventas", kind: "responsibility", area: "Ventas y servicios", order: 60, title: "Registrar ventas y servicios", description: "Controlar productos, entrenamientos personales, InBody, VIP y bronceado." },
  { id: "day-caja-apertura", kind: "daily", area: "Caja", order: 10, title: "Revisar apertura y fondo de caja", description: "Confirmar efectivo inicial, datáfono y SINPE." },
  { id: "day-correo", kind: "daily", area: "Facturación", order: 20, title: "Revisar correo y XML de facturación", description: "Atender comprobantes pendientes y confirmar documentos." },
  { id: "day-citas", kind: "daily", area: "Operación", order: 30, title: "Revisar agenda y servicios del día", description: "Verificar citas de bronceado, InBody, entrenamientos y VIP." },
  { id: "day-inventario", kind: "daily", area: "Inventario", order: 40, title: "Revisar productos críticos", description: "Validar faltantes de productos y suministros de recepción." },
  { id: "day-registros", kind: "daily", area: "Administración", order: 50, title: "Actualizar ventas e ingresos extraordinarios", description: "Registrar pagos, ventas, servicios y movimientos especiales." },
  { id: "day-cierre", kind: "daily", area: "Caja", order: 60, title: "Completar cierre y entrega de caja", description: "Conciliar efectivo, tarjeta y SINPE; documentar la entrega." },
  { id: "month-ingresos", kind: "monthly", area: "Finanzas", order: 10, title: "Cierre mensual de ingresos", description: "Consolidar ingresos ordinarios y extraordinarios." },
  { id: "month-pagos", kind: "monthly", area: "Finanzas", order: 20, title: "Conciliación por formas de pago", description: "Comparar efectivo, tarjeta y SINPE contra los registros." },
  { id: "month-personales", kind: "monthly", area: "Servicios", order: 30, title: "Reporte de entrenamientos personales", description: "Consolidar sesiones, cobros y comisiones." },
  { id: "month-servicios", kind: "monthly", area: "Servicios", order: 40, title: "Reporte de InBody, VIP y bronceado", description: "Resumir ventas, sesiones, paquetes y saldos." },
  { id: "month-productos", kind: "monthly", area: "Ventas", order: 50, title: "Ganancia por venta de productos", description: "Calcular ventas, costos y margen de ganancia." },
  { id: "month-clientes", kind: "monthly", area: "Clientes", order: 60, title: "Conteo de clientes nuevos y adultos mayores", description: "Reportar altas y participación del programa." },
  { id: "month-ccss", kind: "monthly", area: "Recursos Humanos", order: 70, title: "Planillas CCSS e INS", description: "Preparar planillas, movimientos e incidencias del período." },
];

function periodKey(kind: DutyKind, now = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return kind === "monthly" ? date.slice(0, 7) : date;
}

async function authorized(req: NextRequest) {
  return Boolean(await resolveStaffSession(req, "reception"));
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const db = await getDb();
    const collection = db.collection<DutyDoc>(RECEPTION_DUTIES_COLLECTION);
    const now = new Date();
    await collection.bulkWrite(
      DEFAULT_DUTIES.map((duty) => ({
        updateOne: {
          filter: { id: duty.id },
          update: {
            $setOnInsert: {
              ...duty,
              active: true,
              completedPeriods: [],
              seeded: true,
              createdAt: now,
              updatedAt: now,
            },
          },
          upsert: true,
        },
      })),
    );
    const duties = await db
      .collection<DutyDoc>(RECEPTION_DUTIES_COLLECTION)
      .find({ active: { $ne: false } })
      .project<DutyDoc>({ _id: 0 })
      .sort({ kind: 1, order: 1 })
      .toArray();

    return NextResponse.json({
      duties: duties.map(({ completedPeriods = [], ...duty }) => ({
        ...duty,
        completed:
          duty.kind !== "responsibility" &&
          completedPeriods.includes(periodKey(duty.kind)),
      })),
      dayKey: periodKey("daily"),
      monthKey: periodKey("monthly"),
    });
  } catch (error) {
    console.error("XTREME RECEPTION DUTIES GET", error);
    return NextResponse.json({ error: "No se pudo cargar el panel de deberes." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await resolveStaffSession(req, "reception");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { id?: string; completed?: boolean };
    const id = String(body.id ?? "").trim();
    if (!id || typeof body.completed !== "boolean") {
      return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
    }

    const db = await getDb();
    const duty = await db
      .collection<DutyDoc>(RECEPTION_DUTIES_COLLECTION)
      .findOne({ id, kind: { $in: ["daily", "monthly"] } });
    if (!duty) {
      return NextResponse.json({ error: "Tarea no encontrada." }, { status: 404 });
    }

    const period = periodKey(duty.kind);
    await db.collection<DutyDoc>(RECEPTION_DUTIES_COLLECTION).updateOne(
      { id },
      body.completed
        ? {
            $addToSet: { completedPeriods: period },
            $set: { updatedAt: new Date(), updatedBy: session.role },
          }
        : {
            $pull: { completedPeriods: period },
            $set: { updatedAt: new Date(), updatedBy: session.role },
          },
    );

    return NextResponse.json({ ok: true, id, completed: body.completed, period });
  } catch (error) {
    console.error("XTREME RECEPTION DUTIES PATCH", error);
    return NextResponse.json({ error: "No se pudo actualizar la tarea." }, { status: 500 });
  }
}
