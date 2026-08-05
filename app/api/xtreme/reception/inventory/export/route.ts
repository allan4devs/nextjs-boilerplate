import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getDb } from "@/lib/helpers/mongodb";
import { listProducts } from "@/lib/xtreme/product-inventory";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  bebidas: "Bebidas",
  proteinas: "Proteínas",
  creatinas: "Creatinas",
  hidratantes: "Hidratantes",
  chicles: "Chicles",
};

export async function GET(req: NextRequest) {
  const session = await resolveStaffSession(req, "reception", true);
  if (!session) return NextResponse.json({ error: "Sesión de recepción requerida." }, { status: 401 });

  const products = await listProducts(await getDb());
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Xtreme Gym";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Inventario", {
    views: [{ state: "frozen", ySplit: 4 }],
    properties: { defaultRowHeight: 20 },
  });

  sheet.mergeCells("A1:J1");
  const title = sheet.getCell("A1");
  title.value = "XTREME GYM · INVENTARIO COMPLETO";
  title.font = { bold: true, size: 18, color: { argb: "FF101010" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD8FF3E" } };
  title.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 34;

  sheet.mergeCells("A2:J2");
  sheet.getCell("A2").value = `Generado: ${new Intl.DateTimeFormat("es-CR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Costa_Rica" }).format(new Date())}`;
  sheet.getCell("A2").font = { italic: true, color: { argb: "FF666666" } };

  sheet.getRow(4).values = ["Categoría", "Producto", "SKU", "Mostrador", "Bodega", "Total vendible", "Unidades por paquete", "Unidades individuales", "Precio", "Valor inventario"];
  const header = sheet.getRow(4);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF171717" } };
  header.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  header.height = 32;

  for (const product of products) {
    const unitsPerPackage = product.unitsPerPackage ?? 1;
    sheet.addRow([
      CATEGORY_LABEL[product.category] ?? product.category,
      product.name,
      product.id,
      product.cameraQuantity ?? product.quantity,
      product.warehouseQuantity ?? 0,
      product.quantity,
      unitsPerPackage,
      product.quantity * unitsPerPackage,
      product.price,
      product.quantity * product.price,
    ]);
  }

  const firstDataRow = 5;
  const lastDataRow = Math.max(firstDataRow, sheet.rowCount);
  sheet.autoFilter = { from: `A4`, to: `J${lastDataRow}` };
  sheet.getColumn(1).width = 16;
  sheet.getColumn(2).width = 38;
  sheet.getColumn(3).width = 28;
  for (const index of [4, 5, 6, 7, 8]) sheet.getColumn(index).width = 18;
  sheet.getColumn(9).width = 16;
  sheet.getColumn(10).width = 20;
  sheet.getColumn(9).numFmt = '₡#,##0';
  sheet.getColumn(10).numFmt = '₡#,##0';

  for (let rowNumber = firstDataRow; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.alignment = { vertical: "middle" };
    if (rowNumber % 2 === 0) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
    row.getCell(6).font = { bold: true };
  }

  const totalRow = sheet.addRow(["", "TOTAL", "", "", "", { formula: `SUM(F${firstDataRow}:F${lastDataRow})` }, "", { formula: `SUM(H${firstDataRow}:H${lastDataRow})` }, "", { formula: `SUM(J${firstDataRow}:J${lastDataRow})` }]);
  totalRow.font = { bold: true, color: { argb: "FF101010" } };
  totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD8FF3E" } };
  totalRow.getCell(10).numFmt = '₡#,##0';

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="inventario-xtreme-gym-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
