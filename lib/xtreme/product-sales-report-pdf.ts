import { PDFDocument, PageSizes, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { PRODUCT_CATEGORY_LABEL, type ProductCategory } from "./product-catalog";

type PdfCategory = ProductCategory | "otros";

export type MonthlySalesReportPdfData = {
  summary: {
    totalIncome: number;
    saleCount: number;
    unitsSold: number;
    averageTicket: number;
    cashIncome: number;
    sinpeIncome: number;
    mixedSaleCount: number;
  };
  categorySummary: Array<{
    category: PdfCategory;
    unitsSold: number;
    saleCount: number;
    totalIncome: number;
    products: Array<{
      productId: string;
      name: string;
      unitsSold: number;
      saleCount: number;
      totalIncome: number;
      averageUnitPrice: number;
    }>;
  }>;
};

const CATEGORY_LABEL: Record<PdfCategory, string> = {
  ...PRODUCT_CATEGORY_LABEL,
  otros: "Otros productos",
};

const COLORS = {
  black: rgb(0.035, 0.035, 0.035),
  ink: rgb(0.08, 0.08, 0.08),
  muted: rgb(0.42, 0.44, 0.42),
  line: rgb(0.84, 0.86, 0.82),
  soft: rgb(0.955, 0.965, 0.94),
  lime: rgb(0.847, 1, 0.243),
  cyan: rgb(0.23, 0.82, 0.9),
  white: rgb(1, 1, 1),
};

const [A4_WIDTH, A4_HEIGHT] = PageSizes.A4;
const PAGE_WIDTH = A4_HEIGHT;
const PAGE_HEIGHT = A4_WIDTH;
const MARGIN = 34;

function safeText(value: string) {
  return value
    .replace(/₡/g, "CRC ")
    .replace(/[–—]/g, "-")
    .replace(/‑/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...");
}

function crc(value: number) {
  return `CRC ${Math.round(value).toLocaleString("en-US")}`;
}

function fitText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const clean = safeText(text);
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;
  let shortened = clean;
  while (shortened.length > 1 && font.widthOfTextAtSize(`${shortened}...`, size) > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened.trimEnd()}...`;
}

export async function buildMonthlySalesReportPdf(
  report: MonthlySalesReportPdfData,
  options: { monthLabel: string; generatedAt?: Date } ,
) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Reporte mensual de ventas - ${options.monthLabel}`);
  pdf.setAuthor("Xtreme Gym");
  pdf.setSubject("Ventas mensuales de productos por categoría");
  pdf.setCreator("Xtreme Gym Inventory");

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const generatedAt = options.generatedAt ?? new Date();

  function addPage(section = "REPORTE MENSUAL DE VENTAS") {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 74, width: PAGE_WIDTH, height: 74, color: COLORS.black });
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 78, width: PAGE_WIDTH, height: 4, color: COLORS.lime });
    page.drawText(section, { x: MARGIN, y: PAGE_HEIGHT - 36, size: 18, font: bold, color: COLORS.white });
    page.drawText(safeText(options.monthLabel.toUpperCase()), { x: MARGIN, y: PAGE_HEIGHT - 57, size: 10, font: bold, color: COLORS.lime });
    page.drawText("XTREME GYM", { x: PAGE_WIDTH - 118, y: PAGE_HEIGHT - 39, size: 12, font: bold, color: COLORS.lime });
    page.drawText("CONTROL DE INVENTARIO", { x: PAGE_WIDTH - 150, y: PAGE_HEIGHT - 56, size: 8, font: regular, color: COLORS.white });
    return page;
  }

  function drawCard(page: PDFPage, x: number, y: number, width: number, label: string, value: string, accent = false) {
    page.drawRectangle({ x, y, width, height: 56, color: accent ? COLORS.lime : COLORS.soft, borderColor: accent ? COLORS.lime : COLORS.line, borderWidth: 1 });
    page.drawText(safeText(label.toUpperCase()), { x: x + 11, y: y + 38, size: 7.5, font: bold, color: accent ? COLORS.ink : COLORS.muted });
    page.drawText(fitText(value, bold, 17, width - 22), { x: x + 11, y: y + 14, size: 17, font: bold, color: COLORS.ink });
  }

  const cover = addPage();
  const cardGap = 8;
  const cardWidth = (PAGE_WIDTH - MARGIN * 2 - cardGap * 2) / 3;
  const cards = [
    ["Total vendido", crc(report.summary.totalIncome), true],
    ["Unidades vendidas", String(report.summary.unitsSold), false],
    ["Ventas registradas", String(report.summary.saleCount), false],
    ["Venta promedio", crc(report.summary.averageTicket), false],
    ["Recibido en efectivo", crc(report.summary.cashIncome), false],
    ["Recibido por SINPE", crc(report.summary.sinpeIncome), false],
  ] as const;
  cards.forEach(([label, value, accent], index) => {
    const row = Math.floor(index / 3);
    const column = index % 3;
    drawCard(cover, MARGIN + column * (cardWidth + cardGap), PAGE_HEIGHT - 154 - row * 65, cardWidth, label, value, accent);
  });

  cover.drawText("DISTRIBUCIÓN POR CATEGORÍA", { x: MARGIN, y: PAGE_HEIGHT - 247, size: 11, font: bold, color: COLORS.ink });
  const sortedCategories = [...report.categorySummary].sort((a, b) => b.totalIncome - a.totalIncome);
  const chartCategories = sortedCategories.slice(0, 8);
  const chartSubtitle = sortedCategories.length > chartCategories.length
    ? `${chartCategories.length} categorías con mayor venta; ${sortedCategories.length - chartCategories.length} adicionales en el detalle`
    : "Monto vendido durante el mes";
  cover.drawText(chartSubtitle, { x: MARGIN, y: PAGE_HEIGHT - 262, size: 8, font: regular, color: COLORS.muted });

  const maxCategoryIncome = sortedCategories[0]?.totalIncome || 1;
  let chartY = PAGE_HEIGHT - 290;
  for (const category of chartCategories) {
    const label = CATEGORY_LABEL[category.category];
    const barX = MARGIN + 112;
    const barWidth = 410 * (category.totalIncome / maxCategoryIncome);
    cover.drawText(fitText(label, bold, 9, 102), { x: MARGIN, y: chartY + 3, size: 9, font: bold, color: COLORS.ink });
    cover.drawRectangle({ x: barX, y: chartY, width: 410, height: 13, color: COLORS.soft });
    cover.drawRectangle({ x: barX, y: chartY, width: Math.max(3, barWidth), height: 13, color: COLORS.lime });
    cover.drawText(crc(category.totalIncome), { x: barX + 422, y: chartY + 3, size: 8, font: bold, color: COLORS.ink });
    cover.drawText(`${category.unitsSold} uds.`, { x: PAGE_WIDTH - MARGIN - 42, y: chartY + 3, size: 8, font: regular, color: COLORS.muted });
    chartY -= 25;
  }

  const allProducts = report.categorySummary.flatMap((category) =>
    category.products.map((product) => ({ ...product, category: category.category })),
  );
  const topProduct = [...allProducts].sort((a, b) => b.unitsSold - a.unitsSold || b.totalIncome - a.totalIncome)[0];
  const insightY = 55;
  cover.drawRectangle({ x: MARGIN, y: insightY, width: PAGE_WIDTH - MARGIN * 2, height: 66, color: COLORS.black });
  cover.drawText("LECTURA RÁPIDA", { x: MARGIN + 14, y: insightY + 46, size: 8, font: bold, color: COLORS.lime });
  cover.drawText(
    topProduct
      ? fitText(`Producto con más unidades: ${topProduct.name} (${topProduct.unitsSold})`, bold, 11, 360)
      : "Sin ventas registradas en este mes",
    { x: MARGIN + 14, y: insightY + 24, size: 11, font: bold, color: COLORS.white },
  );
  cover.drawText(`Pagos mixtos: ${report.summary.mixedSaleCount}`, { x: PAGE_WIDTH - 250, y: insightY + 25, size: 10, font: bold, color: COLORS.white });
  cover.drawText("Los montos son ingresos brutos por ventas; no representan ganancia neta.", { x: MARGIN + 14, y: insightY + 9, size: 7.5, font: regular, color: COLORS.white });

  let page = addPage("DETALLE POR CATEGORÍA");
  let y = PAGE_HEIGHT - 102;

  function drawCategoryHeading(category: MonthlySalesReportPdfData["categorySummary"][number], continuation = false) {
    page.drawRectangle({ x: MARGIN, y: y - 34, width: PAGE_WIDTH - MARGIN * 2, height: 38, color: COLORS.black });
    page.drawRectangle({ x: MARGIN, y: y - 34, width: 7, height: 38, color: COLORS.lime });
    const title = `${CATEGORY_LABEL[category.category]}${continuation ? " - continuación" : ""}`;
    page.drawText(fitText(title.toUpperCase(), bold, 12, 330), { x: MARGIN + 17, y: y - 17, size: 12, font: bold, color: COLORS.white });
    page.drawText(`${category.unitsSold} unidades`, { x: PAGE_WIDTH - 325, y: y - 17, size: 9, font: bold, color: COLORS.white });
    page.drawText(crc(category.totalIncome), { x: PAGE_WIDTH - 152, y: y - 18, size: 12, font: bold, color: COLORS.lime });
    y -= 45;
    const columns = [
      ["PRODUCTO", MARGIN + 10],
      ["UNIDADES", PAGE_WIDTH - 344],
      ["VENTAS", PAGE_WIDTH - 255],
      ["PRECIO PROM.", PAGE_WIDTH - 176],
      ["TOTAL", PAGE_WIDTH - 82],
    ] as const;
    page.drawRectangle({ x: MARGIN, y: y - 18, width: PAGE_WIDTH - MARGIN * 2, height: 22, color: COLORS.soft });
    for (const [label, x] of columns) page.drawText(label, { x, y: y - 10, size: 7.2, font: bold, color: COLORS.muted });
    y -= 22;
  }

  for (const category of report.categorySummary) {
    const requiredHeight = 67 + category.products.length * 23 + 38;
    const freshPageSpace = PAGE_HEIGHT - 102 - 55;
    const fitsOnFreshPage = requiredHeight <= freshPageSpace;
    if (y < 150 || (fitsOnFreshPage && y - requiredHeight < 55)) {
      page = addPage("DETALLE POR CATEGORÍA");
      y = PAGE_HEIGHT - 102;
    }
    drawCategoryHeading(category);
    for (const product of category.products) {
      if (y < 74) {
        page = addPage("DETALLE POR CATEGORÍA");
        y = PAGE_HEIGHT - 102;
        drawCategoryHeading(category, true);
      }
      page.drawLine({ start: { x: MARGIN, y: y - 17 }, end: { x: PAGE_WIDTH - MARGIN, y: y - 17 }, thickness: 0.5, color: COLORS.line });
      page.drawText(fitText(product.name, bold, 8.5, 350), { x: MARGIN + 10, y: y - 10, size: 8.5, font: bold, color: COLORS.ink });
      page.drawText(String(product.unitsSold), { x: PAGE_WIDTH - 324, y: y - 10, size: 8.5, font: bold, color: COLORS.ink });
      page.drawText(String(product.saleCount), { x: PAGE_WIDTH - 235, y: y - 10, size: 8.5, font: regular, color: COLORS.ink });
      page.drawText(crc(product.averageUnitPrice), { x: PAGE_WIDTH - 190, y: y - 10, size: 8, font: regular, color: COLORS.ink });
      page.drawText(crc(product.totalIncome), { x: PAGE_WIDTH - 108, y: y - 10, size: 8, font: bold, color: COLORS.ink });
      y -= 23;
    }
    page.drawRectangle({ x: MARGIN, y: y - 21, width: PAGE_WIDTH - MARGIN * 2, height: 25, color: COLORS.lime });
    page.drawText(`TOTAL ${CATEGORY_LABEL[category.category].toUpperCase()}`, { x: MARGIN + 10, y: y - 12, size: 8.5, font: bold, color: COLORS.ink });
    page.drawText(`${category.unitsSold} unidades`, { x: PAGE_WIDTH - 324, y: y - 12, size: 8.5, font: bold, color: COLORS.ink });
    page.drawText(crc(category.totalIncome), { x: PAGE_WIDTH - 108, y: y - 12, size: 8.5, font: bold, color: COLORS.ink });
    y -= 38;
  }

  const pages = pdf.getPages();
  pages.forEach((current, index) => {
    current.drawLine({ start: { x: MARGIN, y: 34 }, end: { x: PAGE_WIDTH - MARGIN, y: 34 }, thickness: 0.7, color: COLORS.line });
    current.drawText(`Generado: ${generatedAt.toLocaleString("es-CR", { timeZone: "America/Costa_Rica", dateStyle: "medium", timeStyle: "short" })}`, { x: MARGIN, y: 20, size: 7, font: regular, color: COLORS.muted });
    current.drawText(`Página ${index + 1} de ${pages.length}`, { x: PAGE_WIDTH - MARGIN - 58, y: 20, size: 7, font: bold, color: COLORS.muted });
  });

  return pdf.save();
}
