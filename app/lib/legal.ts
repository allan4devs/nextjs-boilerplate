/**
 * Contenido legal y de ayuda de Xtreme Gym (sitio + app).
 * Tono: español de Costa Rica, claro, sin tecnicismos innecesarios.
 */

import { BUSINESS } from "@/lib/constants/business";

export const LEGAL_UPDATED = "19 de julio de 2026";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type HelpTopic = {
  id: string;
  title: string;
  summary: string;
  href: string;
  group: "empezar" | "app" | "gym" | "legal";
};

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: "primer-dia",
    title: "Primer día gratis",
    summary: "Cómo registrarte, activar el acceso y presentarte en el gym.",
    href: "/primer-dia",
    group: "empezar",
  },
  {
    id: "planes",
    title: "Planes y pagos",
    summary: "Día, semana, quincena, mes y pago en línea.",
    href: "/precios",
    group: "empezar",
  },
  {
    id: "preguntas",
    title: "Preguntas frecuentes",
    summary: "Respuestas cortas antes de tu primera visita.",
    href: "/preguntas",
    group: "empezar",
  },
  {
    id: "app-acceso",
    title: "Entrar a la app",
    summary: "Cédula + PIN, recuperar acceso y carné digital.",
    href: "/ayuda#app",
    group: "app",
  },
  {
    id: "app-reservas",
    title: "Reservar clases",
    summary: "Cupos, check-in y qué necesitás para reservar.",
    href: "/ayuda#reservas",
    group: "app",
  },
  {
    id: "contacto",
    title: "Contacto y recepción",
    summary: "WhatsApp, horario y ubicación en Ciudad Quesada.",
    href: "/contacto",
    group: "gym",
  },
  {
    id: "normas",
    title: "Normas del gym",
    summary: "Convivencia, equipo, área infantil y seguridad.",
    href: "/normas",
    group: "gym",
  },
  {
    id: "terminos",
    title: "Condiciones de uso",
    summary: "Reglas del servicio, membresías y la app.",
    href: "/terminos",
    group: "legal",
  },
  {
    id: "privacidad",
    title: "Privacidad",
    summary: "Qué datos usamos y para qué (cédula, correo, PIN).",
    href: "/privacidad",
    group: "legal",
  },
];

export const APP_HELP_SECTIONS: LegalSection[] = [
  {
    id: "app",
    title: "Cómo entrar a la app de socios",
    paragraphs: [
      "La app (Member OS) es el acceso digital de Xtreme Gym: reservas, carné, rachas, progreso y avisos.",
      "Para entrar necesitás una cuenta activada con correo verificado y un PIN de 4 dígitos.",
    ],
    bullets: [
      "Abrí /app en el celular o guardala en la pantalla de inicio.",
      "Ingresá tu cédula (podés escanear el carnet o digitarla).",
      "Escribí tu PIN de 4 dígitos.",
      "Si no tenés cuenta: registrate en Primer día o pedí el enlace en recepción.",
    ],
  },
  {
    id: "pin",
    title: "PIN de seguridad",
    paragraphs: [
      "El PIN protege tu perfil. Se crea una sola vez al completar el registro (o con código al correo si la cuenta ya existía).",
    ],
    bullets: [
      "Usá 4 dígitos que recuerdes (evitá 0000 o 1234).",
      "Para cambiarlo: Perfil → Cambiar PIN (necesitás el PIN actual).",
      "Si lo olvidaste: en la pantalla del PIN tocá «Olvidé mi PIN» y pedí el código al correo verificado.",
      "No compartas el PIN. Si alguien más lo usó, cambialo y avisá en recepción.",
    ],
  },
  {
    id: "reservas",
    title: "Reservas y clases",
    paragraphs: [
      "Las clases grupales tienen cupo. Reservá desde Entrenar → Clases antes de que inicie la clase.",
    ],
    bullets: [
      "Necesitás un plan activo, un pase del día o tu primer día gratis vigente.",
      "Si no tenés acceso, la app te ofrece activar un plan o pase sin salir de la cuenta.",
      "El check-in de la clase se abre unos 30 minutos antes del inicio.",
      "Si no podés ir, cancelá la reserva para liberar el cupo a otra persona.",
    ],
  },
  {
    id: "avisos",
    title: "Avisos y correos",
    paragraphs: [
      "Podés recibir avisos en el celular (push) y por correo: racha, reservas, renovación y novedades.",
    ],
    bullets: [
      "Activá los push desde Perfil → Avisos de la app.",
      "Los correos opcionales se pueden apagar desde el enlace al pie de cada mensaje o en Preferencias de correo.",
      "Los avisos de seguridad (PIN, recibos, confirmación de cuenta) se siguen enviando aunque desactives los opcionales.",
    ],
  },
];

export const GYM_HELP_SECTIONS: LegalSection[] = [
  {
    id: "visita",
    title: "Tu visita al gym",
    paragraphs: [
      `Estamos en ${BUSINESS.location}. Lunes a viernes 5:00 AM-10:00 PM, sábados 6:00 AM-6:00 PM y domingos 7:00 AM-1:00 PM.`,
    ],
    bullets: [
      "Llevá ropa cómoda, tenis de entrenamiento, toalla y agua.",
      "El primer día gratis se activa con registro por correo; presentate en recepción con tu nombre o cédula.",
      "Hay instructores para orientarte en el uso del equipo.",
      "Parqueo y espacios de apoyo sujetos a disponibilidad.",
    ],
  },
  {
    id: "areas",
    title: "Zonas y beneficios",
    paragraphs: [
      "Contás con zonas de calistenia, peso libre, cardio, tren superior y Lower Lab, más medición corporal sin costo según disponibilidad.",
    ],
    bullets: [
      "El área infantil no es servicio de cuido: la persona adulta es responsable en todo momento.",
      "Respetá los turnos en máquinas y limpiá el equipo después de usarlo.",
      "Consultá en recepción horarios de clases y condiciones del día.",
    ],
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "alcance",
    title: "1. Alcance",
    paragraphs: [
      "Estas condiciones regulan el uso de las instalaciones de Xtreme Gym en Ciudad Quesada y de la app de socios (sitio web, Member OS, reservas y servicios digitales asociados).",
      "Al registrarte, pagar un plan, usar la app o entrenar en el gym, aceptás estas condiciones y las normas de convivencia publicadas en Normas del gym.",
    ],
  },
  {
    id: "servicio",
    title: "2. Servicio del gimnasio",
    paragraphs: [
      "Xtreme Gym ofrece acceso a zonas de entrenamiento, orientación de instructores, clases según programación y beneficios descritos en el sitio (medición corporal, parqueo y espacios de apoyo), sujetos a disponibilidad y a las normas de uso.",
    ],
    bullets: [
      "Los horarios pueden ajustarse por feriados, mantenimiento o causas de fuerza mayor; se avisará por los canales habituales cuando sea posible.",
      "El acompañamiento de instructores es de orientación general y no sustituye consulta médica o fisioterapéutica.",
      "El área infantil no es un servicio de cuido profesional.",
    ],
  },
  {
    id: "salud",
    title: "3. Salud y responsabilidad",
    paragraphs: [
      "El entrenamiento físico implica riesgo. Al usar el gym o la app declarás que estás en condiciones de entrenar o que contás con autorización de un profesional de la salud cuando corresponda.",
    ],
    bullets: [
      "Informá a recepción o al instructor si tenés alguna condición relevante de salud.",
      "Usá el equipo de forma segura y pedí ayuda si no conocés un ejercicio o máquina.",
      "Xtreme Gym no se hace responsable por lesiones derivadas del mal uso del equipo, del incumplimiento de normas o de condiciones de salud no informadas.",
    ],
  },
  {
    id: "membresias",
    title: "4. Membresías, primer día y pagos",
    paragraphs: [
      "Los planes (día, semana, quincena, mes u otros vigentes) se activan al confirmar el pago en línea o el registro en recepción, según el caso.",
    ],
    bullets: [
      "El primer día gratis es una promoción de bienvenida sujeta a un registro válido; no incluye plan continuo ni obliga a comprar después.",
      "Los precios publicados en el sitio son los vigentes al momento de la compra.",
      "Los pagos en línea se procesan por proveedores externos (por ejemplo PayPal); el cobro se rige también por sus términos.",
      "Salvo error de cobro o anulación acordada con recepción, las membresías pagadas no son reembolsables una vez activado el acceso.",
      "El abuso del primer día gratis (cuentas múltiples, datos falsos) puede anular el beneficio.",
    ],
  },
  {
    id: "app",
    title: "5. Uso de la app de socios",
    paragraphs: [
      "La app es un complemento del servicio: reservas, check-in, progreso, carné digital y avisos. El acceso se autentica con cédula y PIN (y sesión segura en el navegador).",
    ],
    bullets: [
      "Sos responsable de la confidencialidad de tu PIN y del dispositivo donde iniciás sesión.",
      "Las reservas están sujetas a cupo, horario y a tener un derecho de acceso vigente (plan, pase o primer día).",
      "Cancelá con tiempo si no podés asistir a una clase reservada.",
      "Podemos suspender cuentas ante uso indebido, fraude, acoso o intento de acceso no autorizado.",
      "Las funciones pueden evolucionar; cambios importantes se comunican en la app o por correo cuando aplique.",
    ],
  },
  {
    id: "conducta",
    title: "6. Conducta",
    paragraphs: [
      "Se espera respeto hacia el equipo, otros socios y el personal. Está prohibido el acoso, el uso de drogas ilícitas, el ingreso en estado de ebriedad y cualquier conducta que ponga en riesgo a terceros.",
    ],
    bullets: [
      "El incumplimiento de normas puede implicar amonestación, suspensión temporal o cancelación del acceso sin reembolso en casos graves.",
      "Las reglas de equipo, vestimenta y limpieza se detallan en Normas del gym.",
    ],
  },
  {
    id: "propiedad",
    title: "7. Contenidos y marca",
    paragraphs: [
      "El nombre Xtreme Gym, la identidad visual, textos, fotos y software de la app son de uso exclusivo del gimnasio o de sus licenciantes. No está permitido copiar, revender ni usar la marca sin autorización.",
    ],
  },
  {
    id: "cambios",
    title: "8. Cambios y contacto",
    paragraphs: [
      `Podemos actualizar estas condiciones. La fecha de actualización aparece al inicio de la página. El uso continuado del gym o la app después de un cambio implica aceptación de la versión vigente.`,
      `Consultas: ${BUSINESS.email} · WhatsApp ${BUSINESS.phone} · ${BUSINESS.location}.`,
    ],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: "responsable",
    title: "1. Quién trata tus datos",
    paragraphs: [
      `Xtreme Gym (${BUSINESS.location}) es responsable del tratamiento de los datos personales que nos das al registrarte, pagar, entrenar o usar la app.`,
      `Contacto: ${BUSINESS.email} · ${BUSINESS.phone}.`,
    ],
  },
  {
    id: "datos",
    title: "2. Qué datos usamos",
    paragraphs: ["Según el servicio, podemos tratar:"],
    bullets: [
      "Identidad: nombre, cédula o documento, teléfono y correo.",
      "Acceso a la app: hash del PIN (no guardamos el PIN en texto claro), sesiones y preferencias.",
      "Membresía y pagos: plan, fechas, montos y referencias de pago (sin almacenar números completos de tarjeta en nuestros servidores).",
      "Uso del servicio: reservas, check-ins, entrenos registrados, medidas corporales que vos cargues y progreso en la app.",
      "Comunicaciones: correos y, si los activás, avisos push en el dispositivo.",
      "Soporte: mensajes que nos envíes por WhatsApp, chat o correo.",
      "Opcional en recepción: foto de perfil o datos biométricos de apoyo al check-in solo si el servicio está habilitado y con el flujo correspondiente.",
    ],
  },
  {
    id: "finalidad",
    title: "3. Para qué los usamos",
    paragraphs: ["Usamos los datos para:"],
    bullets: [
      "Crear y proteger tu cuenta de socio.",
      "Activar planes, pases y el primer día gratis.",
      "Permitir reservas, carné digital y registro de entrenos.",
      "Enviar avisos de seguridad (PIN, recibos) y, si lo permitís, recordatorios y novedades.",
      "Mejorar el servicio, la seguridad del local y la experiencia en la app.",
      "Cumplir obligaciones legales y resolver incidencias de cobro o acceso.",
    ],
  },
  {
    id: "base",
    title: "4. Base del tratamiento",
    paragraphs: [
      "Tratamos datos porque son necesarios para el contrato de membresía o el uso de la app, porque tenés un interés legítimo en la seguridad del gym, porque nos diste consentimiento (por ejemplo, marketing opcional o push) o porque la ley lo exige.",
    ],
  },
  {
    id: "compartir",
    title: "5. Con quién se comparten",
    paragraphs: [
      "No vendemos tus datos. Solo los compartimos con proveedores necesarios para operar el servicio, por ejemplo:",
    ],
    bullets: [
      "Procesadores de pago (p. ej. PayPal) para completar cobros.",
      "Proveedores de correo y notificaciones (envío de enlaces, OTP y avisos).",
      "Hosting e infraestructura donde corre la app.",
      "Autoridades, solo si hay obligación legal o requerimiento válido.",
    ],
  },
  {
    id: "seguridad",
    title: "6. Seguridad",
    paragraphs: [
      "Aplicamos medidas razonables: cifrado en tránsito (HTTPS), PIN hasheado, sesiones con cookie HttpOnly, códigos de un solo uso para recuperar el PIN y controles de acceso en paneles de staff.",
      "Ningún sistema es 100 % infalible; si detectamos un incidente que te afecte de forma relevante, te avisaremos por los medios disponibles.",
    ],
  },
  {
    id: "retencion",
    title: "7. Conservación",
    paragraphs: [
      "Conservamos los datos mientras tengas cuenta o membresía y el tiempo adicional necesario para contabilidad, seguridad, disputas o requisitos legales. Podés pedir corrección o eliminación de datos no indispensables escribiendo a recepción o al correo indicado; evaluaremos la solicitud según la ley y las obligaciones del negocio.",
    ],
  },
  {
    id: "derechos",
    title: "8. Tus opciones",
    paragraphs: [
      "Podés actualizar nombre, teléfono y preferencias desde la app (cuando la sesión esté activa).",
    ],
    bullets: [
      "Desactivar correos opcionales desde el pie del correo o Preferencias de correo.",
      "Desactivar push en el dispositivo o desde Perfil → Avisos.",
      "Recuperar o cambiar el PIN con el correo verificado.",
      "Solicitar ayuda con tu ficha en recepción si hay datos incorrectos del alta.",
    ],
  },
  {
    id: "menores",
    title: "9. Menores de edad",
    paragraphs: [
      "El servicio está orientado a personas con capacidad de contratar o con acompañamiento de un adulto responsable. El área infantil requiere supervisión permanente del adulto a cargo.",
    ],
  },
  {
    id: "cambios-priv",
    title: "10. Cambios",
    paragraphs: [
      `Podemos actualizar esta política. La fecha de actualización se muestra al inicio. La versión vigente siempre está en ${BUSINESS.location ? "xtremecr.com/privacidad" : "/privacidad"}.`,
    ],
  },
];

export const NORMS_SECTIONS: LegalSection[] = [
  {
    id: "general",
    title: "1. Convivencia",
    paragraphs: [
      "Xtreme es un espacio para entrenar con respeto. Todos merecen concentrarse y sentirse seguros.",
    ],
    bullets: [
      "Tratá con cortesía a socios, instructores y recepción.",
      "No grites, no hostigues y no uses lenguaje ofensivo.",
      "Cedé el paso y respetá turnos en máquinas y zonas compartidas.",
      "El personal puede pedirte que ajustes una conducta si afecta a otros.",
    ],
  },
  {
    id: "equipo",
    title: "2. Equipo y zonas",
    paragraphs: ["El equipo es de todos: cuídalo para que siga disponible."],
    bullets: [
      "Limpiá bancos y máquinas después de usarlos.",
      "Devolvé discos, mancuernas y accesorios a su lugar.",
      "No dejes bolsos en zonas de paso o de entrenamiento.",
      "Si una máquina falla, avisá en recepción; no intentes repararla.",
      "Pedí orientación si no sabés usar un equipo.",
    ],
  },
  {
    id: "higiene",
    title: "3. Higiene y vestimenta",
    paragraphs: [
      "Entrená con ropa y calzado deportivo adecuados. Se recomienda toalla personal y botella de agua.",
    ],
    bullets: [
      "No se permite entrenar sin camisa o sin calzado cerrado de deporte.",
      "Mantené el aseo personal básico por respeto al resto.",
    ],
  },
  {
    id: "seguridad",
    title: "4. Seguridad",
    paragraphs: [
      "Priorizá técnica y control de cargas. No pongas en riesgo a quienes entrenan cerca.",
    ],
    bullets: [
      "No dejes barras o discos en el suelo de forma peligrosa.",
      "No corras ni hagas juegos bruscos en zonas de peso.",
      "Si te sentís mal, detenete y pedí ayuda.",
      "Está prohibido el ingreso con armas, drogas ilícitas o en estado de ebriedad.",
    ],
  },
  {
    id: "infantil",
    title: "5. Área infantil",
    paragraphs: [
      "Es un espacio de apoyo para familias, no un servicio de cuido. La persona adulta es responsable del menor en todo momento.",
    ],
  },
  {
    id: "pertenencias",
    title: "6. Pertenencias",
    paragraphs: [
      "Cuidá tus objetos personales. El gym no se responsabiliza por pérdidas o robos dentro de las instalaciones; usá casilleros o dejá lo valioso en casa cuando puedas.",
    ],
  },
  {
    id: "foto",
    title: "7. Fotos y redes",
    paragraphs: [
      "Si grabás o fotografiás, respetá la privacidad de otras personas. No publiques a terceros sin su permiso. El gym puede usar imágenes del local y de actividades generales para promoción, cuidando no exponer de forma indebida a socios.",
    ],
  },
  {
    id: "incumplimiento",
    title: "8. Incumplimiento",
    paragraphs: [
      "El personal puede amonestar, pedir que dejes de usar un área o suspender el acceso ante faltas graves o reincidencia. En casos serios (agresiones, hurto, daño intencional) se puede cancelar la membresía y, si aplica, acudir a las autoridades.",
    ],
  },
];
