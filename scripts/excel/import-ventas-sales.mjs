/**
 * Importa las ventas de producto de la hoja "Ventas" del control manual
 * (VENTAS DEL GIMNASIO*.xlsx) hacia la colección xtreme_gym_product_sales.
 *
 * Qué hace:
 *  - Lee cada fila REAL de la hoja "Ventas" (producto + monto). Ignora las ~459
 *    filas de plantilla vacías (fórmulas arrastradas sin datos).
 *  - Normaliza método de pago (SINPE/efectivo/tarjeta + typos), deriva cantidad
 *    y precio desde total cuando falta, y arma un ProductSaleDoc.
 *  - id determinístico por fila de hoja: `sale-xlsx-ventas-row<N>`. Idempotente:
 *    re-correr hace upsert por id, no duplica.
 *  - No toca inventario (importación histórica): marca inventoryAlreadyReconciled.
 *  - Reemplaza las importaciones viejas desde foto (source "spreadsheet-photo-*"):
 *    en --apply las borra, porque el Excel es ahora la fuente completa.
 *  - Método de pago se pliega al enum de la app: card -> cash, transfer/unknown
 *    -> sinpe. El texto original del Excel queda en sourceMethod.
 *
 * Uso:
 *   node --env-file=.env scripts/excel/import-ventas-sales.mjs \
 *     --workbook "C:/.../VENTAS DEL GIMNASIO(Recuperado automáticamente).xlsx" \
 *     --report scripts/excel/ventas-import-report.json
 *   (agregar --apply para escribir; sin --apply es vista previa)
 */
import { writeFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { MongoClient } from "mongodb";

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : "";
};
const workbookPath = argValue("--workbook");
const reportPath = argValue("--report");
const apply = args.includes("--apply");
if (!workbookPath) throw new Error("Falta --workbook con la ruta al .xlsx.");
if (!process.env.MONGODB_URI) throw new Error("Falta MONGODB_URI.");

const now = new Date();
const SOURCE = "xlsx:VENTAS DEL GIMNASIO:Ventas";

const clean = (v) => String(v ?? "").trim().replace(/\s+/g, " ");
const normLower = (v) =>
  clean(v).toLocaleLowerCase("es-CR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** celda -> primitivo; fórmula -> result; result objeto (#N/A) -> null */
const prim = (cell) => {
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) {
      const r = v.result;
      return r && typeof r === "object" ? null : r ?? null;
    }
    if ("text" in v) return v.text;
    return null;
  }
  return v;
};

/** método de pago del Excel -> valor detectado (antes de plegar). */
function detectMethod(raw) {
  const s = normLower(raw);
  if (!s) return "unknown";
  if (s.startsWith("sin") || s.includes("sinp")) return "sinpe";
  if (s.startsWith("efe") || s.includes("efec") || s.includes("efet")) return "cash";
  if (s.startsWith("tarj")) return "card";
  if (s.startsWith("transf")) return "sinpe";
  if (s.startsWith("mix")) return "mixed";
  return "unknown";
}

/** pliega al enum de la app: card -> cash, unknown/transfer -> sinpe. */
function foldMethod(detected) {
  if (detected === "card") return "cash";
  if (detected === "unknown") return "sinpe";
  return detected; // sinpe | cash | mixed
}

// ---- leer Excel ----
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(workbookPath);
const ws = wb.worksheets.find((w) => w.name === "Ventas");
if (!ws) throw new Error('No se encontró la hoja "Ventas".');
const H = {};
ws.getRow(1).eachCell((c, i) => { H[clean(c.value)] = i; });
for (const req of ["Fecha", "Producto", "Código", "Método de pago", "Cantidad", "Precio unitario", "Total"]) {
  if (!H[req]) throw new Error(`Falta la columna requerida en Ventas: ${req}`);
}
const get = (row, name) => prim(row.getCell(H[name]));

const rows = [];
for (let r = 2; r <= ws.rowCount; r += 1) {
  const row = ws.getRow(r);
  const fecha = get(row, "Fecha");
  const producto = clean(get(row, "Producto"));
  const codigo = clean(get(row, "Código"));
  const cantidad = Number(get(row, "Cantidad")) || 0;
  const precio = Number(get(row, "Precio unitario")) || 0;
  const total = Number(get(row, "Total")) || 0;
  const metodoRaw = clean(get(row, "Método de pago"));
  const nota = clean(get(row, "Nota"));

  const hasDate = fecha instanceof Date;
  const hasMoney = precio > 0 || total > 0;
  if (!producto || !hasMoney) continue; // fila de plantilla / incompleta

  // fecha válida (2025-2027); fuera de rango -> se registra pero se marca
  let iso = "";
  let dateSuspect = false;
  if (hasDate) {
    const y = fecha.getUTCFullYear();
    if (y >= 2025 && y <= 2027) iso = fecha.toISOString().slice(0, 10);
    else { iso = fecha.toISOString().slice(0, 10); dateSuspect = true; }
  } else {
    dateSuspect = true;
  }

  const qty = cantidad > 0
    ? cantidad
    : precio > 0 && total > 0 && total % precio === 0
      ? total / precio
      : 1;
  const unitPrice = precio > 0 ? precio : qty > 0 ? Math.round(total / qty) : total;
  const saleTotal = total > 0 ? total : unitPrice * qty;

  rows.push({
    sheetRow: r,
    iso,
    dateSuspect,
    producto,
    codigo,
    detected: detectMethod(metodoRaw),
    method: foldMethod(detectMethod(metodoRaw)),
    methodRaw: metodoRaw,
    qty,
    unitPrice,
    total: saleTotal,
    nota,
  });
}

// ---- Mongo ----
const client = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 20_000,
  connectTimeoutMS: 20_000,
});
await client.connect();
const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
const Sales = db.collection("xtreme_gym_product_sales");

try {
  // Importaciones viejas desde foto: el Excel es ahora la fuente completa, así
  // que se reemplazan (se borran en --apply). En vista previa solo se cuentan.
  const photoFilter = { source: { $regex: /^spreadsheet-photo/ } };
  const photoToDelete = await Sales.countDocuments(photoFilter);

  // ids ya presentes de una corrida previa de ESTE importador
  const existingIds = new Set(
    (await Sales.find({ source: SOURCE }, { projection: { id: 1 } }).toArray()).map((d) => d.id),
  );

  const toUpsert = [];
  const report = { insert: [], updateSameSource: [], suspectDate: [] };

  for (const row of rows) {
    const id = `sale-xlsx-ventas-row${row.sheetRow}`;
    const productId = row.codigo ? normLower(row.codigo).replace(/[^a-z0-9]+/g, "-") : `sin-codigo-${normLower(row.producto).replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`;
    const createdAt = row.iso ? new Date(`${row.iso}T12:00:00.000Z`) : now;
    const doc = {
      id,
      items: [{ productId, name: row.producto, quantity: row.qty, unitPrice: row.unitPrice }],
      total: row.total,
      paymentMethod: row.method,
      cashAmount: row.method === "cash" ? row.total : 0,
      sinpeAmount: row.method === "sinpe" ? row.total : 0,
      soldBy: "import",
      source: SOURCE,
      sourceRow: row.sheetRow,
      sourceCode: row.codigo,
      sourceMethod: row.methodRaw,
      detectedMethod: row.detected,
      note: row.nota,
      inventoryAlreadyReconciled: true,
      dateSuspect: row.dateSuspect,
      createdAt,
      importedAt: now,
    };
    toUpsert.push(doc);
    if (existingIds.has(id)) report.updateSameSource.push({ id, iso: row.iso, producto: row.producto, total: row.total });
    else report.insert.push({ id, iso: row.iso, producto: row.producto, qty: row.qty, method: row.method, total: row.total });
    if (row.dateSuspect) report.suspectDate.push({ sheetRow: row.sheetRow, producto: row.producto, methodRaw: row.methodRaw });
  }

  const methodBreakdown = {};
  const amountByMethod = {};
  let grandTotal = 0;
  for (const d of toUpsert) {
    methodBreakdown[d.paymentMethod] = (methodBreakdown[d.paymentMethod] || 0) + 1;
    amountByMethod[d.paymentMethod] = (amountByMethod[d.paymentMethod] || 0) + d.total;
    grandTotal += d.total;
  }

  const summary = {
    mode: apply ? "APPLY" : "dry-run",
    workbook: workbookPath,
    realSaleRows: rows.length,
    willUpsert: toUpsert.length,
    newInserts: report.insert.length,
    updatesToPriorImport: report.updateSameSource.length,
    photoImportsToDelete: photoToDelete,
    suspectDateRows: report.suspectDate.length,
    grandTotalCrc: grandTotal,
    countByMethod: methodBreakdown,
    amountByMethod,
  };

  let writeResult = null;
  if (apply) {
    const del = await Sales.deleteMany(photoFilter);
    const res = toUpsert.length
      ? await Sales.bulkWrite(
          toUpsert.map((d) => ({
            updateOne: { filter: { id: d.id }, update: { $set: d }, upsert: true },
          })),
          { ordered: false },
        )
      : { upsertedCount: 0, matchedCount: 0, modifiedCount: 0 };
    writeResult = {
      photoImportsDeleted: del.deletedCount,
      upserted: res.upsertedCount,
      matched: res.matchedCount,
      modified: res.modifiedCount,
    };
  }

  console.log(JSON.stringify({ ...summary, writeResult }, null, 2));
  if (reportPath) {
    await writeFile(
      reportPath,
      JSON.stringify({ generatedAt: now.toISOString(), summary, writeResult, ...report }, null, 2),
      "utf8",
    );
    console.log(`Reporte: ${reportPath}`);
  }
  if (!apply) console.log("Vista previa solamente. Agregá --apply para escribir en MongoDB.");
} finally {
  await client.close();
}
