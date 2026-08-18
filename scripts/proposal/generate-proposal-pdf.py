from pathlib import Path
import shutil

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "Propuesta_Xtreme_Gym_Fase_2.pdf"
COPIES = (
    ROOT / "scripts" / "proposal" / "Propuesta_Xtreme_Gym_Fase_2.pdf",
    ROOT / "app" / "fase2" / "Propuesta_Xtreme_Gym_Fase_2.pdf",
)

PAGE_W, PAGE_H = letter
BLACK = colors.HexColor("#0B0F0F")
INK = colors.HexColor("#151817")
GRAY = colors.HexColor("#747B7F")
LINE = colors.HexColor("#DDE1DE")
PAPER = colors.HexColor("#FFFFFF")
SOFT = colors.HexColor("#F3F5F2")
LIME = colors.HexColor("#C8FF28")
LIME_DARK = colors.HexColor("#557800")
WARM = colors.HexColor("#FFF9DC")
GOLD = colors.HexColor("#F2C94C")


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="ProposalBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.3,
        leading=12.2,
        textColor=INK,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="ProposalSmall",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.1,
        leading=10.2,
        textColor=GRAY,
    )
)
styles.add(
    ParagraphStyle(
        name="ProposalH1",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=21,
        leading=23.5,
        textColor=INK,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="ProposalH2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=16.5,
        leading=19,
        textColor=INK,
        spaceBefore=2,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="ProposalH3",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=11.6,
        leading=14,
        textColor=INK,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="ProposalLabel",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9,
        textColor=GRAY,
        spaceBefore=3,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="ProposalBullet",
        parent=styles["ProposalBody"],
        leftIndent=12,
        firstLineIndent=-9,
        bulletIndent=0,
        spaceAfter=2.3,
    )
)
styles.add(
    ParagraphStyle(
        name="ProposalHeroTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=19,
        leading=22,
        textColor=PAPER,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="ProposalHeroKicker",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=12,
        textColor=LIME,
        spaceAfter=9,
    )
)
styles.add(
    ParagraphStyle(
        name="ProposalHeroBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=12,
        textColor=colors.HexColor("#CDD2D0"),
    )
)
styles.add(
    ParagraphStyle(
        name="ProposalPayment",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=17,
        alignment=TA_CENTER,
        textColor=GRAY,
    )
)


def p(text: str, style: str = "ProposalBody") -> Paragraph:
    return Paragraph(text, styles[style])


def bullets(items: list[str]) -> list[Paragraph]:
    return [p(f"- {item}", "ProposalBullet") for item in items]


def section_label(text: str) -> Paragraph:
    return p(text.upper(), "ProposalLabel")


def accent_box(title: str, text: str, warm: bool = False) -> Table:
    background = WARM if warm else SOFT
    accent = GOLD if warm else LIME
    content = p(f"<b>{title}</b><br/>{text}", "ProposalBody")
    table = Table([["", content]], colWidths=[6, 499])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), accent),
                ("BACKGROUND", (1, 0), (1, 0), background),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (1, 0), (1, 0), 12),
                ("RIGHTPADDING", (1, 0), (1, 0), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def grid(cards: list[tuple[str, str]], columns: int = 2) -> Table:
    rows = []
    for start in range(0, len(cards), columns):
        row = []
        for title, text in cards[start : start + columns]:
            row.append(p(f"<b>{title}</b><br/><font color='#747B7F'>{text}</font>", "ProposalSmall"))
        while len(row) < columns:
            row.append("")
        rows.append(row)
    widths = [505 / columns] * columns
    table = Table(rows, colWidths=widths)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SOFT),
                ("GRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def data_table(headers: list[str], rows: list[list[str]], widths: list[float]) -> Table:
    data = [[p(f"<font color='#C8FF28'><b>{h.upper()}</b></font>", "ProposalSmall") for h in headers]]
    data.extend([[p(cell, "ProposalSmall") for cell in row] for row in rows])
    table = Table(data, colWidths=widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BLACK),
                ("BACKGROUND", (0, 1), (-1, -1), SOFT),
                ("GRID", (0, 1), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def page_chrome(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.setFillColor(GRAY)
    canvas.drawRightString(PAGE_W - 0.62 * inch, PAGE_H - 0.39 * inch, "XTREME GYM  |  PROPUESTA DE DESARROLLO")
    canvas.setFont("Helvetica", 7.2)
    canvas.drawString(0.62 * inch, 0.34 * inch, "Allan Rojas  |  Desarrollo de Software")
    canvas.drawCentredString(PAGE_W / 2, 0.34 * inch, f"Agosto 2026  |  {doc.page}")
    canvas.restoreState()


def build_story():
    story = []

    hero = Table(
        [[p("XTREME <font color='#C8FF28'>GYM</font>", "ProposalHeroTitle")],
         [p("FASE 2 - PROPUESTA DE DESARROLLO", "ProposalHeroKicker")],
         [p("Inventario de máquinas, ecosistema QR y facturación electrónica directa", "ProposalHeroTitle")],
         [p("Una nueva capa operativa integrada sobre la plataforma actual de Xtreme Gym.", "ProposalHeroBody")]],
        colWidths=[505],
    )
    hero.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), BLACK),
                ("LEFTPADDING", (0, 0), (-1, -1), 18),
                ("RIGHTPADDING", (0, 0), (-1, -1), 18),
                ("TOPPADDING", (0, 0), (0, 0), 17),
                ("TOPPADDING", (0, 1), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 3), (0, 3), 16),
            ]
        )
    )
    story += [Spacer(1, 10), hero, Spacer(1, 14)]

    facts = [
        [p("CLIENTE<br/><font color='#151817'><b>Xtreme Gym</b></font>", "ProposalLabel"), p("ATENCIÓN<br/><font color='#151817'><b>Eyleen &amp; Alejandro</b></font>", "ProposalLabel"), p("DESARROLLO<br/><font color='#151817'><b>Allan Rojas</b></font>", "ProposalLabel")],
        [p("FECHA<br/><font color='#151817'><b>18 de agosto de 2026</b></font>", "ProposalLabel"), p("INVERSIÓN<br/><font color='#557800'><b>$800 USD</b></font>", "ProposalLabel"), p("MODALIDAD<br/><font color='#151817'><b>50% / 50%</b></font>", "ProposalLabel")],
    ]
    fact_table = Table(facts, colWidths=[168.3] * 3)
    fact_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), SOFT),
                ("LINEBELOW", (0, 0), (-1, -1), 0.6, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story += [fact_table, Spacer(1, 14), section_label("Resumen ejecutivo")]
    story += [
        p(
            "Esta segunda etapa conecta activos físicos, socios, cobros y Hacienda dentro de una sola plataforma. "
            "Incluye inventario completo de máquinas, QR por máquina, QR personal por socio y facturación "
            "electrónica real operada directamente desde <b>xtremecr.com</b>."
        ),
        Spacer(1, 3),
        accent_box(
            "Resultado principal",
            "Xtreme podrá emitir, firmar y enviar comprobantes electrónicos a Hacienda sin depender de Odoo, "
            "Latinsoft ni otro facturador externo.",
        ),
        Spacer(1, 14),
        section_label("Plataforma ya desarrollada"),
        p("La fase anterior, desarrollada por $300 USD, ya dejó una base digital robusta y en producción:"),
        grid(
            [
                ("Dominio + landing", "Presencia web oficial y puntos de conversión."),
                ("App de socios", "Login, PIN, membresía, entrenamientos y progreso."),
                ("Ingreso + recepción", "Acceso, atención y cobros dentro del gimnasio."),
                ("Trainer + Admin", "Herramientas para entrenadores y administración."),
                ("Pagos + usuarios", "Socios, membresías y cobros centralizados."),
                ("Arquitectura", "Una plataforma propia preparada para seguir creciendo."),
            ]
        ),
        Spacer(1, 11),
        accent_box(
            "Cortesía incluida",
            "El inventario de bebidas, registro de productos y control de ventas desarrollado previamente se "
            "mantiene sin costo adicional.",
        ),
    ]

    story.append(PageBreak())
    story += [
        section_label("01 - Activos físicos"),
        p("Sistema de inventario de máquinas", "ProposalH1"),
        p(
            "Un módulo para administrar el inventario completo de máquinas y equipos sin perder orden, historial "
            "ni trazabilidad. Cada activo tendrá una ficha viva, consultable y editable desde administración."
        ),
        Spacer(1, 5),
        data_table(
            ["Identificación", "Operación", "Seguimiento"],
            [
                ["Nombre, tipo y código interno", "Ubicación y categoría", "Estado y observaciones"],
                ["Marca, modelo y fotografías", "Grupo muscular", "Historial de mantenimiento"],
                ["Fecha de adquisición", "Instrucciones de uso", "Reportes de avería"],
            ],
            [168.3] * 3,
        ),
        Spacer(1, 11),
        accent_box(
            "Resultado operativo",
            "Administración podrá consultar, filtrar y actualizar el inventario desde un solo panel, facilitando "
            "el mantenimiento, la ubicación y el control de cada activo.",
        ),
        Spacer(1, 17),
        section_label("02 - QR por máquina"),
        p("Identificación individual y acceso inmediato", "ProposalH2"),
        p("Cada máquina tendrá un QR único asociado directamente con su registro. Al escanearlo, el sistema abrirá su información correspondiente."),
        *bullets(
            [
                "Identificación inmediata del equipo.",
                "Información de uso, ejercicios y grupos musculares asociados.",
                "Historial de mantenimiento y reporte de averías desde el piso.",
                "Base para estadísticas de utilización y mantenimiento preventivo.",
            ]
        ),
        Spacer(1, 13),
        section_label("03 - QR personal por socio"),
        p("Cada socio tendrá su propio QR dentro de la app", "ProposalH2"),
        p("El código quedará vinculado a la cuenta del socio como una capa rápida de identificación dentro del ecosistema de Xtreme."),
        grid(
            [
                ("Identificación", "Consulta rápida del socio."),
                ("Membresía", "Validación de estado y datos autorizados."),
                ("Recepción", "Integración con procesos de atención."),
                ("Ingreso", "Base para una futura entrada mediante QR."),
                ("Actividad", "Asociación de acciones o máquinas al usuario."),
                ("App", "Visualización desde su cuenta personal."),
            ],
            columns=3,
        ),
    ]

    story.append(PageBreak())
    story += [
        section_label("04 - Cobros de recepción"),
        p("Del pago al comprobante, sin duplicar trabajo", "ProposalH1"),
        p(
            "Cada pase del día, mensualidad o cobro suelto quedará registrado con cliente, concepto, monto, "
            "método de pago y operador. Desde esa misma operación se emitirá el comprobante fiscal correspondiente."
        ),
        data_table(
            ["Cobro", "Responsable", "Documento"],
            [
                ["SINPE, efectivo o tarjeta", "Operador de recepción", "Factura o tiquete electrónico"],
                ["Cliente, concepto y monto", "Fecha y trazabilidad", "Estado ante Hacienda"],
            ],
            [168.3] * 3,
        ),
        Spacer(1, 17),
        section_label("05 - Facturación electrónica"),
        p("Integración directa con Hacienda", "ProposalH1"),
        p(
            "Xtreme podrá facturar desde <b>xtremecr.com</b> como lo haría en Odoo u otro facturador, pero dentro "
            "de su propio sistema. El módulo completará el ciclo técnico del comprobante electrónico:"
        ),
        grid(
            [
                ("Emisión", "Facturas, tiquetes y notas de crédito o débito."),
                ("Estructura", "XML oficial versión 4.4, impuestos, clave y consecutivo."),
                ("Firma", "Firma electrónica XAdES con la llave configurada."),
                ("Hacienda", "Autenticación, envío y consulta directa del estado."),
                ("Seguimiento", "Aceptación, rechazo, mensajes y reintentos controlados."),
                ("Entrega", "Historial, XML, representación PDF y envío al cliente."),
            ]
        ),
        Spacer(1, 12),
        accent_box(
            "Qué aporta Xtreme",
            "Sus datos fiscales correctos y el acceso que tenga vigente en TRIBU-CR o ATV. Allan se encarga de "
            "configurar las credenciales de comprobantes electrónicos, la llave y firma, los consecutivos y la "
            "comunicación con Hacienda como parte de esta fase.",
            warm=True,
        ),
        Spacer(1, 12),
        accent_box(
            "Control propio",
            "No se requiere contratar un facturador externo. Latinsoft puede seguir manejando el acceso biométrico, "
            "pero la facturación deja de depender de esa plataforma.",
        ),
        Spacer(1, 17),
        section_label("06 - Administración e integración total"),
        p("Todo se maneja desde el Admin OS actual", "ProposalH2"),
        *bullets(
            [
                "Consultar cobros por método, operador y estado ante Hacienda.",
                "Emitir, consultar y reenviar comprobantes electrónicos.",
                "Administrar usuarios, máquinas y sus códigos QR.",
                "Mantener unidos socios, membresías, activos, cobros y documentos fiscales.",
            ]
        ),
        Spacer(1, 8),
        p(
            "<b>SOCIOS  &gt;  RECEPCIÓN  &gt;  COBROS  &gt;  FIRMA  &gt;  HACIENDA  &gt;  HISTORIAL</b>",
            "ProposalSmall",
        ),
    ]

    story.append(PageBreak())
    story += [
        section_label("Inversión"),
        p("Propuesta económica", "ProposalH1"),
    ]
    pricing = Table(
        [[p("<font color='#FFFFFF'><b>DESARROLLO FASE 2</b></font><br/><font color='#CDD2D0'>Inventario + QR + cobros + Hacienda</font>", "ProposalBody"), p("<b>$800 USD</b>", "ProposalH1")]],
        colWidths=[310, 195],
    )
    pricing.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), BLACK),
                ("BACKGROUND", (1, 0), (1, 0), LIME),
                ("ALIGN", (1, 0), (1, 0), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 15),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
            ]
        )
    )
    story += [pricing, Spacer(1, 16), section_label("Incluye")]
    story += bullets(
        [
            "Sistema de inventario de máquinas con panel administrativo.",
            "QR individual para cada máquina, con ficha, historial y reporte de averías.",
            "QR personal para cada socio, integrado a la app existente.",
            "Registro de cobros de recepción con método de pago y operador.",
            "Emisión de facturas, tiquetes y notas electrónicas desde xtremecr.com.",
            "XML v4.4, firma XAdES y comunicación directa con Hacienda.",
            "Seguimiento de aceptación o rechazo, reintentos y entrega de XML y PDF.",
            "Diseño de datos, lógica, integración con Admin OS y pruebas funcionales.",
        ]
    )
    story += [Spacer(1, 13), section_label("Forma de pago")]
    payment = Table(
        [[p("50% AL INICIAR<br/><font size='15' color='#151817'>$400</font>", "ProposalPayment"), p("50% CONTRA ENTREGA<br/><font size='15' color='#151817'>$400</font>", "ProposalPayment")]],
        colWidths=[252.5, 252.5],
    )
    payment.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SOFT),
                ("GRID", (0, 0), (-1, -1), 0.5, LINE),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story += [
        payment,
        Spacer(1, 13),
        accent_box(
            "Cortesía: $0",
            "Inventario de bebidas, registro de productos y control de ventas desarrollado previamente. Se mantiene sin costo adicional.",
        ),
        Spacer(1, 13),
        section_label("Consideraciones"),
        *bullets(
            [
                "La inversión cubre las funcionalidades descritas y su integración con la plataforma existente.",
                "Xtreme aporta sus datos fiscales correctos y el acceso vigente de TRIBU-CR o ATV; la configuración técnica, firma e integración con Hacienda están incluidas.",
                "No se requiere un facturador externo. Hardware, impresoras, etiquetas, lectores QR o servicios opcionales de terceros no están incluidos.",
                "Cambios fuera de este alcance, incluida la superficie VIP, se evalúan como una fase posterior.",
            ]
        ),
        Spacer(1, 12),
        section_label("Visión de crecimiento"),
        p(
            "Esta fase convierte la plataforma en un sistema propio de operación y facturación para Xtreme Gym. "
            "Sobre esta base podrán incorporarse mantenimiento preventivo, analítica financiera, proveedores, compras, "
            "gastos y nuevas automatizaciones."
        ),
        Spacer(1, 16),
        KeepTogether(
            Table(
                [[p("<font color='#FFFFFF'><b>Allan Rojas</b></font><br/><font color='#C8FF28'>Desarrollo de Software  |  Xtreme Gym</font>", "ProposalBody")]],
                colWidths=[505],
                style=TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), BLACK),
                        ("LEFTPADDING", (0, 0), (-1, -1), 14),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                        ("TOPPADDING", (0, 0), (-1, -1), 12),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
                    ]
                ),
            )
        ),
    ]
    return story


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=letter,
        rightMargin=0.62 * inch,
        leftMargin=0.62 * inch,
        topMargin=0.57 * inch,
        bottomMargin=0.55 * inch,
        title="Propuesta Xtreme Gym - Fase 2",
        author="Allan Rojas",
        subject="Inventario, QR y facturación electrónica directa con Hacienda",
    )
    doc.build(build_story(), onFirstPage=page_chrome, onLaterPages=page_chrome)
    for destination in COPIES:
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(OUTPUT, destination)
    print(OUTPUT)


if __name__ == "__main__":
    main()
