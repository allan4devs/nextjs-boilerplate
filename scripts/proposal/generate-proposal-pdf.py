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


def work_proposal_card(
    num: str,
    title: str,
    text: str,
    items: list[str],
    featured: bool = False,
) -> Table:
    header = Table(
        [[
            p(
                f"PROPUESTA {num}<br/><font size='11' color='#151817'><b>{title}</b></font>",
                "ProposalLabel",
            ),
            p("<font color='#557800'><b>$200</b></font>", "ProposalH2"),
        ]],
        colWidths=[175, 55],
    )
    header.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    content = []
    if featured:
        content.append(p("<font color='#8A6F00'><b>MAYOR COMPLEJIDAD TÉCNICA</b></font>", "ProposalLabel"))
    content.extend([header, p(text, "ProposalSmall"), Spacer(1, 5)])
    content.extend(bullets(items))
    card = Table([[content]], colWidths=[238])
    card.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WARM if featured else SOFT),
                ("BOX", (0, 0), (-1, -1), 1.5 if featured else 0.5, GOLD if featured else LINE),
                ("LINEABOVE", (0, 0), (-1, 0), 4 if featured else 0.5, LIME if featured else LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 11),
                ("RIGHTPADDING", (0, 0), (-1, -1), 11),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    return card


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
         [p("Operación conectada: máquinas, QR, ingreso y Hacienda", "ProposalHeroTitle")],
         [p("La fase que convierte cada uso, ingreso y cobro en información compartida.", "ProposalHeroBody")]],
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
        [p("FECHA<br/><font color='#151817'><b>18 de agosto de 2026</b></font>", "ProposalLabel"), p("INVERSIÓN<br/><font color='#557800'><b>$800 USD</b></font>", "ProposalLabel"), p("MODALIDAD<br/><font color='#151817'><b>3 o 4 pagos</b></font>", "ProposalLabel")],
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
            "Esta segunda etapa conecta identidad, activos, uso, ingreso, cobros y Hacienda dentro de una sola "
            "plataforma. Cada QR, rostro y transacción genera datos que administración puede aprovechar para "
            "mejorar la experiencia diaria y preparar la centralización total de la Fase 3."
        ),
        Spacer(1, 3),
        accent_box(
            "Resultado principal",
            "El socio escanea, aprende, registra su tiempo y entra con mayor facilidad; Xtreme ve ocupación, "
            "activos, cobros y facturas dentro de la misma operación.",
        ),
        Spacer(1, 14),
        section_label("Plataforma ya desarrollada"),
        p("La Fase 1 ya dejó una base digital robusta y en producción:"),
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
        section_label("Resultados comprobables - corte al 18 de agosto de 2026"),
        p("La plataforma ya produce datos útiles", "ProposalH1"),
        p(
            "La bitácora, los ingresos, los cobros, las ventas y la presencia digital ya generan evidencia real. "
            "La Fase 2 conecta esa base con máquinas, tiempos, ocupación, biometría y Hacienda."
        ),
        Spacer(1, 6),
        accent_box(
            "Bitácora interna - últimos 14 días",
            "334 sesiones, 10 socios identificados, 3.671 vistas, 1.230 clics y 162 acciones. "
            "El corte excluye 25 sesiones internas de prueba o QA.",
        ),
        Spacer(1, 13),
        grid(
            [
                ("2.076 socios", "Base central de personas, membresías y seguimiento."),
                ("70 ingresos", "60 socios únicos identificados en los últimos 30 días."),
                ("CRC 179.000 en cobros", "8 pagos completados y trazables durante 30 días."),
                ("28 ventas de productos", "29 unidades y CRC 37.000 registrados desde recepción."),
            ]
        ),
        Spacer(1, 15),
        section_label("Google Search - 11 de julio al 16 de agosto"),
        p("La visibilidad orgánica ya está creciendo", "ProposalH2"),
        data_table(
            ["Visibilidad", "Respuesta", "Posicionamiento"],
            [
                ["1.178 impresiones", "39 clics - CTR 3,31%", "Posición media 4,36"],
                ["+51,5% de impresiones", "163 a 247 por semana", "Consultas locales entre 1 y 4"],
            ],
            [168.3] * 3,
        ),
        Spacer(1, 13),
        accent_box(
            "Vercel Analytics - últimos 7 días",
            "102 visitantes y 1.924 páginas vistas; 84% desde Costa Rica, 62% móvil y 8 visitantes "
            "referidos por Google.",
            warm=True,
        ),
        Spacer(1, 11),
        p(
            "<b>Lectura comercial:</b> Xtreme ya puede medir atención, uso, ingresos, dinero y demanda digital. "
            "La Fase 2 convierte estas señales en una ruta completa: búsqueda o campaña, visita web, ingreso al "
            "gimnasio, uso, cobro y factura.",
            "ProposalSmall",
        ),
        Spacer(1, 7),
        p(
            "Fuentes: Admin OS y base operativa de xtremecr.com; Search Console; Vercel Analytics. "
            "Google Ads y Google Maps se incorporan al tablero de atribución al conectar o exportar sus métricas.",
            "ProposalSmall",
        ),
    ]

    story.append(PageBreak())
    story += [
        section_label("01 - Operación conectada"),
        p("Cada máquina se vuelve parte activa del sistema", "ProposalH1"),
        p(
            "La Fase 2 une inventario, contenido, identidad y tiempo. Máquinas, almohadillas, cadenas, agarres, "
            "repuestos y accesorios quedan vinculados a una ficha viva con ubicación, estado e historial."
        ),
        Spacer(1, 5),
        data_table(
            ["Activo", "Contexto", "Seguimiento"],
            [
                ["Nombre, marca, modelo y código", "Ubicación y categoría", "Estado y disponibilidad"],
                ["Fotografías y fecha de compra", "Accesorios y repuestos asignados", "Mantenimiento e incidencias"],
            ],
            [168.3] * 3,
        ),
        Spacer(1, 15),
        section_label("02 - QR por máquina"),
        p("Video, instrucciones y uso medible desde el mismo punto", "ProposalH2"),
        p(
            "Al escanear el código, el socio abre la experiencia de esa máquina sin buscarla dentro de la app. "
            "Desde ahí aprende a usarla e inicia o finaliza su tiempo."
        ),
        grid(
            [
                ("Contenido", "Video de uso correcto, instrucciones y seguridad."),
                ("Entrenamiento", "Ejercicios y grupos musculares relacionados."),
                ("Tiempo", "Inicio y finalización del uso de la máquina."),
                ("Soporte", "Reporte de averías desde el piso."),
            ]
        ),
        Spacer(1, 14),
        section_label("03 - QR personal por socio"),
        p("Todos los usuarios dejan trazabilidad de sus tiempos", "ProposalH2"),
        p(
            "Cada sesión queda ligada a una persona, una máquina y una hora. Esto crea historial personal y datos "
            "reales para entender demanda, rotación y horarios más fluidos."
        ),
        grid(
            [
                ("Por usuario", "Historial y duración dentro de la app."),
                ("Por máquina", "Uso acumulado y equipos con mayor demanda."),
                ("Por horario", "Horas pico, permanencia y rotación."),
                ("A futuro", "Progreso y recomendaciones con datos reales."),
            ],
        ),
        Spacer(1, 14),
        section_label("04 - Ingreso y ocupación"),
        p("Acceso biométrico propio y una vista viva del gimnasio", "ProposalH2"),
        p(
            "xtremecr.com administra el registro facial, lo vincula con identidad y membresía y valida cada ingreso. "
            "Las entradas y salidas alimentan una vista clara para recepción y administración."
        ),
        grid(
            [
                ("Biometría", "Registro y validación facial propios."),
                ("Ocupación", "Personas dentro en tiempo real."),
                ("Flujo", "Entradas, salidas y permanencia por hora."),
                ("Capacidad", "Mejor lectura de horas pico."),
            ]
        ),
    ]

    story.append(PageBreak())
    story += [
        section_label("05 - Cobros de recepción"),
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
        section_label("06 - Facturación electrónica"),
        p("Integración directa con Hacienda", "ProposalH1"),
        p(
            "Xtreme podrá facturar directamente desde <b>xtremecr.com</b>. El módulo completará dentro de su "
            "propio sistema todo el ciclo técnico del comprobante electrónico:"
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
            "xtremecr.com administra identidad, registro facial, validación biométrica, membresía, ingreso, salida, "
            "ocupación y facturación dentro del mismo ecosistema.",
        ),
        Spacer(1, 17),
        section_label("07 - Visión operativa"),
        p("Personas, equipos, tiempos y dinero en el Admin OS", "ProposalH2"),
        *bullets(
            [
                "Ver quién está dentro, ingresos, salidas y permanencia.",
                "Consultar tiempos por máquina, socio y horario.",
                "Administrar activos, accesorios, videos y códigos QR.",
                "Consultar cobros por método, operador y estado ante Hacienda.",
                "Emitir, consultar y reenviar comprobantes electrónicos.",
            ]
        ),
        Spacer(1, 8),
        p(
            "<b>SOCIO &gt; QR &gt; MÁQUINA &gt; TIEMPO &gt; PROGRESO</b><br/>"
            "<b>ROSTRO &gt; INGRESO &gt; OCUPACIÓN &gt; COBRO &gt; HACIENDA</b>",
            "ProposalSmall",
        ),
    ]

    story.append(PageBreak())
    story += [
        section_label("Fase 3 - La centralización completa"),
        p("Todos los sistemas conectados. Una única fuente de verdad.", "ProposalH1"),
        p(
            "La Fase 3 termina de digitalizar la operación completa. Socios, staff, activos, accesos, cobros, "
            "gastos y tareas se relacionan con responsables, fechas, costos y evidencia dentro del mismo sistema."
        ),
        Spacer(1, 8),
        accent_box(
            "El paso que hace posible esta visión",
            "Cerrar la Fase 2 significa que usuarios, activos, accesos, tiempos, cobros y facturas ya hablan el "
            "mismo idioma. La Fase 3 puede centralizar el resto sin rehacer la base.",
        ),
        Spacer(1, 14),
        grid(
            [
                ("Una fuente de verdad", "Personas, activos, accesos, dinero y operación sin sistemas separados."),
                ("Bronceado 100% digital", "Clientes, paquetes, sesiones, tiempos, disponibilidad y consentimientos."),
                ("Matrícula legal", "Contratos, autorizaciones y documentos de padres o encargados para menores."),
                ("Gastos y recibos de luz", "Archivo, vencimientos, comparación por periodo y trazabilidad."),
                ("Facilidades y cámaras", "Zonas, incidencias, revisiones, responsables y estado de equipos."),
                ("Mantenimiento y limpieza", "Personas, turnos, tareas, evidencia, frecuencia y cumplimiento."),
                ("Relojes y música", "Dispositivos, horarios, configuraciones e incidencias operativas."),
                ("Cierres, caja e incidencias", "Arqueos, inspecciones, pendientes y entrega de turno digital."),
            ]
        ),
        Spacer(1, 16),
        accent_box(
            "Alcance comercial",
            "Esta visión de Fase 3 no forma parte de la inversión actual. Se cotiza por separado una vez "
            "consolidada la Fase 2 y sus datos operativos.",
            warm=True,
        ),
    ]

    story.append(PageBreak())
    story += [
        section_label("Inversión"),
        p("Cuatro propuestas de $200. Una Fase 2 de $800.", "ProposalH1"),
        p(
            "Cada propuesta genera una entrega verificable y prepara la siguiente. Hacienda se desarrolla al final "
            "porque reutiliza la identidad, catálogos y cobros construidos en los tres bloques anteriores."
        ),
    ]
    pricing = Table(
        [[p("<font color='#FFFFFF'><b>TOTAL FASE 2</b></font><br/><font color='#CDD2D0'>4 propuestas conectadas  |  $200 cada una</font>", "ProposalBody"), p("<b>$800 USD</b>", "ProposalH1")]],
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
    work_grid = Table(
        [
            [
                work_proposal_card(
                    "01",
                    "Base operativa e inventario",
                    "Crea el catálogo de activos que las siguientes entregas necesitan.",
                    [
                        "Máquinas, accesorios, repuestos y ubicaciones.",
                        "Ficha, estado, fotografías e historial.",
                        "Administración desde el Admin OS.",
                    ],
                ),
                work_proposal_card(
                    "02",
                    "Experiencia QR y tiempos",
                    "Convierte cada sesión en información medible.",
                    [
                        "Videos e instrucciones por máquina.",
                        "QR personal con inicio, fin y duración.",
                        "Horas pico, demanda y rotación.",
                    ],
                ),
            ],
            [
                work_proposal_card(
                    "03",
                    "Ingreso, ocupación y control",
                    "Une identidad, membresía, ingreso y recepción.",
                    [
                        "Registro y acceso biométrico propios.",
                        "Personas dentro, entradas y permanencia.",
                        "Cobros por método, operador e historial.",
                    ],
                ),
                work_proposal_card(
                    "04",
                    "Hacienda y facturación",
                    "El bloque más exigente, apoyado en las tres propuestas anteriores.",
                    [
                        "Facturas, tiquetes y notas electrónicas.",
                        "XML v4.4, firma XAdES y envío.",
                        "Estados, reintentos, XML y PDF.",
                    ],
                    featured=True,
                ),
            ],
        ],
        colWidths=[252.5, 252.5],
    )
    work_grid.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story += [
        pricing,
        Spacer(1, 14),
        work_grid,
        Spacer(1, 12),
        accent_box(
            "Por qué Hacienda aparece en $200",
            "Es la entrega de mayor complejidad y valor técnico. Su precio dentro del paquete completo se sostiene "
            "porque reutiliza datos, catálogos, identidad y cobros construidos en las propuestas 01, 02 y 03.",
            warm=True,
        ),
    ]

    story.append(PageBreak())
    story += [
        section_label("Opciones de pago"),
        p("El mismo total de $800, con dos formas de avanzar", "ProposalH1"),
        p(
            "La opción de tres pagos reduce fricción administrativa. La opción de cuatro pagos mantiene una "
            "relación directa entre cada pago y su propuesta de trabajo."
        ),
        Spacer(1, 10),
        p("Opción recomendada - 3 pagos", "ProposalH3"),
    ]
    payment_three = Table(
        [[
            p("INICIO<br/><font size='15' color='#151817'><b>$300</b></font>", "ProposalPayment"),
            p("OPERACIÓN CONECTADA<br/><font size='15' color='#151817'><b>$250</b></font>", "ProposalPayment"),
            p("ENTREGA CON HACIENDA<br/><font size='15' color='#151817'><b>$250</b></font>", "ProposalPayment"),
        ]],
        colWidths=[168.3] * 3,
    )
    payment_three.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WARM),
                ("BOX", (0, 0), (-1, -1), 2, GOLD),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, GOLD),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )
    story += [payment_three, Spacer(1, 18), p("Opción por propuesta - 4 pagos", "ProposalH3")]
    payment_four = Table(
        [[
            p("PROPUESTA 01<br/><font size='14' color='#151817'><b>$200</b></font>", "ProposalPayment"),
            p("PROPUESTA 02<br/><font size='14' color='#151817'><b>$200</b></font>", "ProposalPayment"),
            p("PROPUESTA 03<br/><font size='14' color='#151817'><b>$200</b></font>", "ProposalPayment"),
            p("PROPUESTA 04<br/><font size='14' color='#151817'><b>$200</b></font>", "ProposalPayment"),
        ]],
        colWidths=[126.25] * 4,
    )
    payment_four.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SOFT),
                ("BOX", (0, 0), (-1, -1), 0.5, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story += [
        payment_four,
        Spacer(1, 18),
        accent_box(
            "Cortesía: $0",
            "Inventario de bebidas, registro de productos y control de ventas desarrollado previamente. Se mantiene sin costo adicional.",
        ),
        Spacer(1, 16),
        section_label("Consideraciones"),
        *bullets(
            [
                "Las cuatro propuestas funcionan como entregas conectadas de $200; el total de la Fase 2 es $800.",
                "Hacienda es el bloque de mayor complejidad y se entrega al final sobre la base ya construida.",
                "Xtreme aporta sus datos fiscales correctos y el acceso vigente de TRIBU-CR o ATV; la configuración técnica, firma e integración con Hacienda están incluidas.",
                "No se requiere un facturador externo. Hardware, impresoras, etiquetas, lectores QR o servicios opcionales de terceros no están incluidos.",
                "La centralización total de la Fase 3 se cotiza por separado una vez consolidada esta fase.",
            ]
        ),
        Spacer(1, 14),
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
