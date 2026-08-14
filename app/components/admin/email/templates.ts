/**
 * Contenido de cada campaña: asunto, título y cuerpo por audiencia.
 *
 * Es texto de cara al socio, en español costarricense, y se edita mucho más
 * seguido que la pantalla que lo manda. Por eso vive aparte: cambiar una
 * palabra de un correo no debería tocar el archivo del componente.
 */
import type { AudienceId } from "./types";

export type CampaignTemplate = {
  subject: string;
  title: string;
  message: string;
  ctaLabel: string;
  ctaPath: string;
};

/** Plantillas listas por audiencia - tono tico, claro y positivo. */
export const CLAIM_BASE: CampaignTemplate = {
  subject: "Activá tu plan en Xtreme Gym cuando querás",
  title: "Tu cuenta ya está lista en Xtreme Gym Ciudad Quesada",
  message:
    "Hola. Ya tenés un perfil en Xtreme Gym, pero tu correo todavía no está verificado y queremos que revisés los datos que tenemos asociados.\n\n" +
    "Cuando estés listo, activá tu cuenta y elegí el plan que mejor te funcione. Vas a poder disfrutar de más beneficios Xtreme:\n" +
    "• App de socios\n" +
    "• Reservas de clases\n" +
    "• Niveles, entrenamientos y máquinas\n" +
    "• Seguimiento de salud y progreso\n" +
    "• Promociones y comunidad\n\n" +
    "El enlace es personal y vence en 72 horas. Pura vida - equipo Xtreme Gym, Ciudad Quesada.",
  ctaLabel: "Revisar datos y elegir mi plan",
  // Placeholder de UI: el procesador NUNCA manda esta ruta sola.
  // Por cada destinatario emite token personal (64 hex), lo guarda en pending
  // y solo entonces envía /registro/confirmar?token=…. Sin token válido → reintento, no correo.
  ctaPath: "/registro/confirmar",
};

export const CAMPAIGN_TEMPLATES: Record<AudienceId, CampaignTemplate> = {
  claim_profile: CLAIM_BASE,
  claim_recovered: {
    ...CLAIM_BASE,
    subject: "Confirmá tus datos en Xtreme Gym",
    title: "Encontramos tu ficha - activá la app",
    message:
      "Hola. Según la lista del gym, este correo te pertenece y ya teníamos tu nombre en Xtreme Gym.\n\n" +
      "Tocá el enlace personal: vas a ver nombre, teléfono y cédula para confirmarlos o corregirlos, y creás tu PIN de 4 dígitos.\n\n" +
      "Así dejás la cuenta lista para reservar clases y usar la app.\n\n" +
      "El enlace vence en 72 horas. Pura vida - Xtreme Gym, Ciudad Quesada.",
    ctaLabel: "Confirmar mis datos",
  },
  claim_native: {
    ...CLAIM_BASE,
    subject: "Activá tu correo en Xtreme Gym",
    title: "Falta un paso para entrar a la app",
    message:
      "Hola. Tu correo ya está en la ficha de Xtreme Gym, pero todavía no lo verificaste.\n\n" +
      "Con el enlace de este mensaje completás o corregís tus datos y creás tu PIN.\n\n" +
      "Pura vida - equipo Xtreme.",
  },
  claim_active_plan: {
    subject: "Tu plan en Xtreme ya está activo - confirmá tus datos",
    title: "Ya tenés plan: solo falta confirmar la cuenta",
    message:
      "Hola. En Xtreme Gym ya figurás con un plan vigente (semana, quincena, mes o adultos mayores).\n\n" +
      "Con este enlace revisás nombre, teléfono y cédula, y creás tu PIN de 4 dígitos. Al entrar a la app vas a ver tu plan tal como está en recepción.\n\n" +
      "No es una venta nueva: es solo para que uses la app con lo que ya pagaste.\n\n" +
      "El enlace vence en 72 horas. Pura vida - Xtreme Gym, Ciudad Quesada.",
    ctaLabel: "Confirmar mis datos",
    ctaPath: "/registro/confirmar",
  },
  invite_recoverable: {
    subject: "Tu invitación a la app de Xtreme Gym",
    title: "Confirmá tus datos y creá tu acceso",
    message:
      "Hola. Te escribimos de Xtreme Gym en Ciudad Quesada porque este correo figura en nuestra lista de contactos del gimnasio.\n\n" +
      "Si entrenás con nosotros o lo hiciste antes, te invitamos a activar tu cuenta en la app de socios. Es gratis y te toma un momento: con el botón de abajo abrís un enlace personal (válido por 72 horas), revisás o completás tus datos y elegís un PIN de 4 dígitos. Después entrás con tu cédula y ese PIN.\n\n" +
      "Vas a poder reservar clases, seguir tu progreso y usar las herramientas del gym desde el celular.\n\n" +
      "Si este mensaje no es para vos, podés ignorarlo o darte de baja con el enlace al final del correo. Equipo Xtreme Gym · Ciudad Quesada.",
    ctaLabel: "Confirmar mis datos y crear PIN",
    // El envío real inyecta ?token=… por persona. Sin token no se envía.
    ctaPath: "/registro/confirmar",
  },
  unverified_not_sent: {
    subject: "Tu invitación a la app de Xtreme Gym",
    title: "Confirmá tus datos y creá tu acceso",
    message:
      "Hola. Te escribimos de Xtreme Gym en Ciudad Quesada porque este correo figura en nuestra lista de contactos del gimnasio.\n\n" +
      "Si entrenás con nosotros o lo hiciste antes, te invitamos a activar tu cuenta en la app de socios. Es gratis y te toma un momento: con el botón de abajo abrís un enlace personal (válido por 72 horas), revisás o completás tus datos y elegís un PIN de 4 dígitos. Después entrás con tu cédula y ese PIN.\n\n" +
      "Vas a poder reservar clases, seguir tu progreso y usar las herramientas del gym desde el celular.\n\n" +
      "Si este mensaje no es para vos, podés ignorarlo o darte de baja con el enlace al final del correo. Equipo Xtreme Gym · Ciudad Quesada.",
    ctaLabel: "Confirmar mis datos y crear PIN",
    ctaPath: "/registro/confirmar",
  },
  excel_recovered: {
    ...CLAIM_BASE,
    subject: "Tu correo en Xtreme Gym",
    title: "Actualizamos el contacto de tu ficha",
    message:
      "Hola. Asociamos este correo a tu ficha en Xtreme Gym a partir de la lista del gimnasio (nombre y apellidos).\n\n" +
      "Si todavía no activaste la app, usá el enlace para revisar tus datos y crear tu PIN. Si ya tenés acceso, podés entrar directo a la app.\n\n" +
      "Pura vida - Xtreme Gym, Ciudad Quesada.",
  },
  winback_90: {
    subject: "Te extrañamos en Xtreme - volvé cuando quieras",
    title: "Tu membresía venció hace poco",
    message:
      "Hola. Hace unos meses se te venció el plan en Xtreme Gym y nos encantaría verte de nuevo en el piso.\n\n" +
      "Activá la app con este correo o pasá a recepción / Precios para reactivar tu plan.\n\n" +
      "Ciudad Quesada · Barrio San Pablo. Pura vida.",
    ctaLabel: "Ver planes y volver",
    ctaPath: "/precios",
  },
  winback_180: {
    subject: "¿Volvemos a entrenar en Xtreme Gym?",
    title: "Medio año sin verte en el gym",
    message:
      "Hola. Hace un tiempo se te venció la membresía en Xtreme Gym.\n\n" +
      "El gym sigue con fuerza, máquinas y app de socios. Si querés regresar, activá tu acceso y elegí plan de nuevo.\n\n" +
      "Te esperamos en Ciudad Quesada.",
    ctaLabel: "Quiero volver",
    ctaPath: "/precios",
  },
  winback_365: {
    subject: "Xtreme Gym te recuerda",
    title: "Siempre hay un buen día para volver",
    message:
      "Hola. Hace un buen rato que tu plan en Xtreme Gym no está activo. Si en algún momento entrenaste con nosotros, la puerta sigue abierta.\n\n" +
      "Escribinos, pasá a recepción o mirá los planes. Te esperamos en Ciudad Quesada.",
    ctaLabel: "Ver Xtreme de nuevo",
    ctaPath: "/",
  },
  possible_foreign: {
    subject: "Activá tu acceso a Xtreme Gym",
    title: "Tu cuenta con tu correo",
    message:
      "Hola. En Xtreme Gym podés activar tu acceso con este correo, sin importar si usás cédula nacional u otro documento.\n\n" +
      "Abrí el enlace de invitación, confirmá tus datos y creá tu PIN. Si necesitás ayuda en recepción, con gusto te atendemos.",
    ctaLabel: "Ir a la app",
    ctaPath: "/app",
  },
  never_registered: {
    subject: "Tu acceso a Xtreme Gym te está esperando",
    title: "Activá tu cuenta",
    message:
      "Hola. En Xtreme Gym ya tenés contacto, pero todavía no activaste el acceso a la app.\n\n" +
      "Tocá el botón de este correo: vas a ver los datos asociados a vos (si los hay), podés corregirlos y crear tu PIN.",
    ctaLabel: "Activar mi acceso",
    ctaPath: "/registro/confirmar",
  },
  unregistered: {
    subject: "Volvé a Xtreme Gym - Ciudad Quesada",
    title: "Te extrañamos en el piso",
    message:
      "Hola. Estamos armando de nuevo la comunidad de Xtreme Gym con app, reservas y planes claros.\n\n" +
      "Si entrenabas con nosotros, tocá el botón, revisá tus datos y activá tu acceso.\n\n" +
      "Barrio San Pablo, Ciudad Quesada.",
    ctaLabel: "Activar mi acceso",
    ctaPath: "/registro/confirmar",
  },
  pending: {
    subject: "Te falta un paso: confirmá tu correo en Xtreme",
    title: "Terminá tu registro",
    message:
      "Hola. Empezaste el registro en Xtreme Gym y solo falta confirmar el correo.\n\n" +
      "Tocá el botón de este mensaje, revisá tus datos y creá tu PIN.\n\n" +
      "¡Nos vemos en el gym!",
    ctaLabel: "Terminar mi registro",
    ctaPath: "/registro/confirmar",
  },
  never_opened: {
    subject: "Ya tenés cuenta en Xtreme - abrí la app",
    title: "Tu app te está esperando",
    message:
      "Hola. Tu correo ya está listo en Xtreme Gym, pero todavía no abriste la app.\n\n" +
      "Entrá con tu cédula y tu PIN. Si todavía no creaste el PIN, pedí el código al correo desde la app.\n\n" +
      "Cualquier duda, WhatsApp o recepción. Pura vida.",
    ctaLabel: "Abrir mi app",
    ctaPath: "/app",
  },
  inactive: {
    subject: "Hace rato no te vemos en Xtreme - ¿volvemos?",
    title: "Tu racha te extraña",
    message:
      "Hola. Hace un tiempo no abrís la app ni marcás entrenos en Xtreme Gym.\n\n" +
      "El piso sigue listo. Entrá a la app, revisá tu plan o pasá a recepción.\n\n" +
      "Cuando quieras, te recibimos en Ciudad Quesada. Pura vida.",
    ctaLabel: "Volver a la app",
    ctaPath: "/app",
  },
  members: {
    subject: "Novedades Xtreme Gym",
    title: "Para vos que ya sos de la casa",
    message:
      "Hola. Este correo es para socios con acceso activo en Xtreme Gym.\n\n" +
      "Con la app reservás clases, marcás entrenos y llevás tu carné digital.\n\n" +
      "Gracias por entrenar con nosotros. Nos vemos en el piso.",
    ctaLabel: "Ir a mi app",
    ctaPath: "/app",
  },
  plan_week: {
    subject: "Tu plan semanal en Xtreme - sacale el jugo",
    title: "Semana de entreno, bien enfocada",
    message:
      "Hola. Tenés un plan semanal activo en Xtreme Gym: ideal para meterle con constancia sin enredos.\n\n" +
      "Tip: abrí la app al llegar, marcá el entreno y reservá la clase que te interese. Si querés pasar a quincenal o mensual, en recepción o en Precios te guiamos.\n\n" +
      "Que esta semana se sienta fuerte.",
    ctaLabel: "Ver mi app",
    ctaPath: "/app",
  },
  plan_fortnight: {
    subject: "Tu plan quincenal Xtreme - 15 días para rendir",
    title: "Quincena en marcha",
    message:
      "Hola. Vas con plan quincenal en Xtreme Gym: dos semanas para armar hábito y ver progreso.\n\n" +
      "Usá la app para registrar entrenos y no perder el hilo. Si se te acerca el vencimiento, renovamos en recepción o desde la web de precios.\n\n" +
      "Cualquier duda sobre horarios o zonas, escribinos.",
    ctaLabel: "Abrir la app",
    ctaPath: "/app",
  },
  plan_month: {
    subject: "Tu plan mensual Xtreme - el ritmo que funciona",
    title: "Mes de constancia",
    message:
      "Hola. Tu plan mensual en Xtreme Gym te da el mes completo para entrenar a tu ritmo: fuerza, cardio o funcional.\n\n" +
      "En la app ves tu racha, reservas y perfil. Si querés sumar un plan de trabajo con el coach o medir progreso, pedilo en recepción.\n\n" +
      "Gracias por confiar en nosotros este mes.",
    ctaLabel: "Ir a mi perfil",
    ctaPath: "/app",
  },
  plan_quarter: {
    subject: "Plan trimestral Xtreme - 3 meses de progresión",
    title: "Vas a largo plazo",
    message:
      "Hola. Con el plan trimestral en Xtreme Gym tenés tiempo de verdad para subir cargas, mejorar técnica y armar hábito.\n\n" +
      "Aprovechá la app para no perder entrenos y pedí en recepción una revisión de metas a mitad del trimestre si querés.\n\n" +
      "Estamos con vos en el piso. Pura vida.",
    ctaLabel: "Abrir Member OS",
    ctaPath: "/app",
  },
  plan_free_day: {
    subject: "Tu primer día en Xtreme - no lo dejes pasar",
    title: "El primer día gratis te espera",
    message:
      "Hola. Activaste el primer día gratis en Xtreme Gym. Cuando vengas, presentate en recepción con tu nombre; el equipo te orienta en las zonas.\n\n" +
      "Después podés elegir plan semanal, quincenal, mensual o trimestral sin presión. Mientras, abrí la app y conocé cómo se marcan los entrenos.\n\n" +
      "Te esperamos en Barrio San Pablo, Ciudad Quesada.",
    ctaLabel: "Cómo es el primer día",
    ctaPath: "/primer-dia",
  },
  plan_senior: {
    subject: "Clases de adultos mayores en Xtreme Gym",
    title: "Movimiento con acompañamiento",
    message:
      "Hola. Este mensaje es para quienes están en el plan o las clases de adultos mayores en Xtreme Gym.\n\n" +
      "Trabajamos fuerza suave, movilidad y constancia con acompañamiento. Si necesitás horarios, cupo o cambiar de clase, pasá por recepción o escribinos.\n\n" +
      "Cuidar el cuerpo también es entrenar. Te esperamos.",
    ctaLabel: "Ver adultos mayores",
    ctaPath: "/adultos-mayores",
  },
  plan_other: {
    subject: "Tu plan en Xtreme Gym - un recordatorio amable",
    title: "Seguimos con vos",
    message:
      "Hola. Tenés un plan especial o personalizado en Xtreme Gym.\n\n" +
      "Si tenés dudas de fechas, beneficios o cómo usar la app, recepción te ayuda al toque. También podés entrar a Precios para comparar opciones cuando te toque renovar.\n\n" +
      "Gracias por ser parte de Xtreme.",
    ctaLabel: "Ver precios y planes",
    ctaPath: "/precios",
  },
  no_plan: {
    subject: "Activá tu plan en Xtreme Gym cuando quieras",
    title: "Cuenta lista, plan pendiente",
    message:
      "Hola. Ya tenés perfil en Xtreme Gym, pero todavía no figura un plan activo.\n\n" +
      "Podés elegir en la web (primer día gratis, semanal, quincenal, mensual o trimestral) o en recepción el mismo día. Con plan activo aprovechás el piso y la app al máximo.\n\n" +
      "Cuando estés listo, te esperamos.",
    ctaLabel: "Elegir mi plan",
    ctaPath: "/precios",
  },
  imported: {
    subject: "Xtreme Gym te escribe - lista del gimnasio",
    title: "Seguimos en contacto",
    message:
      "Hola. Formás parte de la lista de contactos de Xtreme Gym en Ciudad Quesada.\n\n" +
      "Queremos invitarte a conocer (o reencontrarte con) el gym: máquinas, zona funcional, app de socios y planes claros. Si ya no querés recibir correos, usá el enlace de preferencias al pie de este mensaje.\n\n" +
      "Pura vida - el equipo Xtreme.",
    ctaLabel: "Conocer Xtreme Gym",
    ctaPath: "/",
  },
  all: {
    subject: "Xtreme Gym · un mensaje para la comunidad",
    title: "Comunidad Xtreme en Ciudad Quesada",
    message:
      "Hola. Este es un aviso general de Xtreme Gym para nuestra comunidad (socios, invitados y lista de contacto).\n\n" +
      "Si ya tenés app, entrá con tu cédula. Si todavía no, registrate o pedí invitación en recepción. Horarios, zonas y precios están en el sitio.\n\n" +
      "Gracias por leernos. Nos vemos en el piso.",
    ctaLabel: "Ir al sitio",
    ctaPath: "/",
  },
  // ── Re-engagement: plantillas listas para encolar ──
  sent_not_registered: {
    subject: "Todavía podés activar tu acceso en Xtreme Gym",
    title: "Te reenviamos el enlace personal",
    message:
      "Hola. Hace poco te escribimos de Xtreme Gym (Ciudad Quesada) para activar tu cuenta en la app de socios, y notamos que todavía no terminaste el registro.\n\n" +
      "No hay presión: si te interesa, con un toque abrís un enlace personal (válido 72 horas), confirmás o corregís tus datos y creás un PIN de 4 dígitos. Después entrás con tu cédula y ese PIN.\n\n" +
      "En la app podés reservar clases, marcar entrenos y llevar tu carné digital.\n\n" +
      "Si ya te registraste, ignorá este mensaje. Si no querés más correos, usá el enlace de preferencias al final. Equipo Xtreme Gym · Barrio San Pablo.",
    ctaLabel: "Activar mi acceso ahora",
    ctaPath: "/registro/confirmar",
  },
  opened_not_registered: {
    subject: "Te faltó un paso en Xtreme - terminá tu registro",
    title: "Abriste el enlace… y casi listo",
    message:
      "Hola. Vimos que abriste la invitación a la app de Xtreme Gym pero no se completó el registro.\n\n" +
      "A veces el enlace se cierra a mitad o vence. Acá va uno nuevo (72 horas): revisá nombre, teléfono y cédula, creá tu PIN de 4 dígitos y listo.\n\n" +
      "Si algo se trabó, escribinos o pasá a recepción y te ayudamos en un toque. Pura vida - Xtreme Gym, Ciudad Quesada.",
    ctaLabel: "Terminar mi registro",
    ctaPath: "/registro/confirmar",
  },
  registered_never_app: {
    subject: "Ya tenés cuenta en Xtreme - abrí la app 1 vez",
    title: "Tu acceso ya está listo",
    message:
      "Hola. Tu correo ya está verificado en Xtreme Gym y tu PIN quedó creado… pero todavía no abriste la app.\n\n" +
      "Te toma un minuto: entrá a la app, poné tu cédula y tu PIN. Vas a ver tu plan (si tenés), reservas, entrenos y el carné digital.\n\n" +
      "Tip: guardala en la pantalla de inicio del celu como una app. Si olvidaste el PIN, desde la misma pantalla podés pedir uno nuevo al correo.\n\n" +
      "Te esperamos en el piso. Pura vida.",
    ctaLabel: "Abrir mi app",
    ctaPath: "/app",
  },
  registered_inactive: {
    subject: "Hace rato no te vemos en la app de Xtreme",
    title: "Tu racha y el piso te esperan",
    message:
      "Hola. Notamos que hace un tiempo no abrís la app de Xtreme Gym. El gym sigue con fuerza: máquinas, zona funcional y clases.\n\n" +
      "Entrá un rato, mirá tu plan, marcá un entreno o reservá la clase que te guste. Si el plan se te venció, en Precios o recepción reactivás en minutos.\n\n" +
      "Cuando quieras, te recibimos en Barrio San Pablo, Ciudad Quesada. Pura vida.",
    ctaLabel: "Volver a la app",
    ctaPath: "/app",
  },
  active_app: {
    subject: "Vas bien en Xtreme - subí un nivel más",
    title: "Para vos que ya usás la app",
    message:
      "Hola. Gracias por estar activo en la app de Xtreme Gym. Sos de los que le meten de verdad.\n\n" +
      "Ideas rápidas para sacarle más jugo esta semana:\n" +
      "• Marcá cada entreno al salir del gym (racha y XP)\n" +
      "• Reservá clase de funcional o lo que te guste con anticipación\n" +
      "• Revisá tu perfil y medidas si querés ver progreso\n" +
      "• Activá notificaciones si todavía no, para no perder recordatorios\n\n" +
      "Si querés un plan de trabajo con el coach o una medición, pedilo en recepción.\n\n" +
      "Seguimos en el piso. Equipo Xtreme · Ciudad Quesada.",
    ctaLabel: "Seguir entrenando",
    ctaPath: "/app",
  },
  plan_expiring: {
    subject: "Tu plan en Xtreme se vence pronto",
    title: "Renová y no pierdas el ritmo",
    message:
      "Hola. Tu plan en Xtreme Gym se acerca al vencimiento (en los próximos días).\n\n" +
      "Para no perder el acceso al piso ni a la app, renovamos en recepción el mismo día o desde la web de precios cuando estés listo. Si tenés dudas de tarifa (semanal, quincenal, mensual, trimestral o adultos mayores), el equipo te orienta.\n\n" +
      "Gracias por entrenar con nosotros. Te esperamos en Barrio San Pablo, Ciudad Quesada.",
    ctaLabel: "Ver precios y renovar",
    ctaPath: "/precios",
  },
  plan_expired_recent: {
    subject: "Tu plan en Xtreme venció - volvé cuando quieras",
    title: "La puerta sigue abierta",
    message:
      "Hola. Tu membresía en Xtreme Gym se venció hace poco y nos gustaría verte de nuevo en el piso.\n\n" +
      "Podés reactivar el plan en recepción o mirar opciones en Precios. Si ya tenés la app, entrá con tu cédula y PIN; si el acceso se cerró, renovamos y listo.\n\n" +
      "Sin presión: cuando estés listo, te recibimos. Pura vida - Xtreme Gym, Ciudad Quesada.",
    ctaLabel: "Reactivar mi plan",
    ctaPath: "/precios",
  },
  free_day_convert: {
    subject: "¿Y después del primer día en Xtreme?",
    title: "Elegí el plan que te sirva",
    message:
      "Hola. Activaste el primer día o un pase diario en Xtreme Gym. Esperamos que te haya gustado el piso.\n\n" +
      "Si querés seguir, tenés planes claros: semanal, quincenal, mensual, trimestral y adultos mayores. En recepción te armamos el que mejor se acomode a tu ritmo, o mirá precios en la web.\n\n" +
      "Con plan activo aprovechás la app, reservas y todo el gym. Te esperamos en Barrio San Pablo, Ciudad Quesada.",
    ctaLabel: "Ver planes",
    ctaPath: "/precios",
  },
};

export function templateFor(audience: AudienceId): CampaignTemplate {
  return CAMPAIGN_TEMPLATES[audience] ?? CAMPAIGN_TEMPLATES.claim_recovered;
}
