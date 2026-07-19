/**
 * Mensajes de cara al socio del Member OS.
 * Tono: tico sancarleno, profesional, voseo natural (podés, tenés, elegí).
 * Cálido sin exagerar; claro y directo.
 */

export const MSG = {
  errors: {
    /** Fetch fallido (sin internet o servidor caído): nunca mostrar "Failed to fetch". */
    offline: "Sin conexión. Revisá tu internet y volvé a intentar en un toque.",
    /** El servidor respondió con error pero sin mensaje utilizable. */
    server: "El servidor anda fallando. Intentá de nuevo en un momento.",
    sessionExpired: "Sesión vencida. Ingresá tu PIN.",
    loadApp: "No se pudo cargar. Intentá de nuevo.",
    cedulaTooShort: (minDigits: number) =>
      `Cédula incompleta (mín. ${minDigits} dígitos).`,
    /** Cuenta no encontrada por cédula — el detalle va en la UI de login. */
    cedulaNotRegistered: "No hay cuenta con esa cédula.",
    /** Ficha existe pero sin acceso activado (sin correo verificado / PIN). */
    cedulaNeedsInvite: "Cuenta sin activar. Pedí el enlace en recepción.",
    cedulaNoProfile: "No encontramos el perfil de esa cédula.",
    profileNotFound: "Perfil no encontrado. Probá con tu cédula.",
    saveGoal: "No se pudo guardar la meta.",
    saveProfile: "No se pudo guardar.",
    badgeNotEarned: "Solo podés fijar badges que ya ganaste.",
    badgeShowcaseFull: "Máximo 3 badges en el showcase.",
    logTraining: "No se pudo registrar el entreno.",
    reserve: "No se pudo reservar.",
    planRequired: "Para reservar necesitás un plan activo o un pase del día.",
    planExpired: "Tu plan no cubre hoy. Renová o comprá un pase del día.",
    planLimit: "Ya usaste los cupos de tu pase. Activá un plan o comprá otro pase.",
    cancelReservation: "No se pudo cancelar.",
    saveMetrics: "No se pudieron guardar las medidas.",
    updatePlan: "No se pudo actualizar el plan.",
    uploadPhoto: "No se pudo subir la foto.",
    processImage: "No se pudo procesar la imagen. Intentá con otra foto.",
    sendReminder: "No se pudo enviar el aviso.",
    pinSendOtp: "No se pudo enviar el código.",
    pinOtpMissing: "Pedí el código al correo primero.",
    pinMismatch: "Los PIN no coinciden.",
    pinAlreadySet: "Ya tenés PIN. Ingresalo, o recuperarlo con el código del correo.",
    pinNotSet: "Todavía no tenés PIN. Crealo con el enlace del correo o el código OTP.",
    pinSetupOtpRequired: "Pedí el código al correo y creá tu PIN (solo una vez).",
    pinSetupInviteRequired: "Pedí el enlace de activación en recepción.",
    pinWrong: "PIN incorrecto.",
    pinValidate: "No se pudo validar el PIN.",
  },
  ok: {
    weeklyGoal: (days: number) => `Meta semanal: ${days} días. A cumplirla.`,
    profileSaved: "Perfil actualizado. Ahora sí, a meterle.",
    badgeShowcaseSaved: "Showcase de badges actualizado.",
    emailPrefsSaved: "Preferencias de correo guardadas.",
    trainingLogged: (name: string) => `Registrado: ${name}. Racha viva.`,
    reserved: (name: string) => `Reservado: ${name}. Llegá 5 minutos antes.`,
    reservationCanceled: (name: string) => `Reserva cancelada: ${name}.`,
    metricsSaved: "Medidas guardadas. Progreso visible, sin cuentos.",
    planItemDone: "Sesión del plan completada. Seguí así.",
    planItemPending: "Sesión marcada como pendiente.",
    photoSaved: "Foto de perfil actualizada.",
    reminderSent: (sentTo: string) => `Aviso enviado a ${sentTo}. Revisá tu correo.`,
    otpSent: (maskedEmail: string, expiresInMin: number) =>
      `Código enviado a ${maskedEmail} (vence en ${expiresInMin} min).`,
    pinChanged: "PIN actualizado. Sesión protegida.",
    pinRecovered: "PIN recuperado. Guardalo bien para la próxima.",
    pinSetupWithSession: "Creá tu PIN de 4 dígitos.",
    pinSetupWithOtp: "Pedí el código al correo y creá tu PIN.",
  },
} as const;
