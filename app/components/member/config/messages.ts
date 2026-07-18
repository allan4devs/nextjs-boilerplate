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
    sessionExpired: "Tu sesión venció. Ingresá el PIN para continuar.",
    loadApp: "No pude cargar Xtreme Gym. Intentá de nuevo.",
    cedulaTooShort: (minDigits: number) =>
      `Digitá o escaneá la cédula (mínimo ${minDigits} dígitos).`,
    cedulaNotRegistered:
      "No hay cuenta activa con esa cédula. El sistema viejo a menudo traía cédulas mal: usá el enlace al correo o pedí invitación en recepción. El correo es la llave; ahí corregís nombre y cédula.",
    cedulaNeedsInvite:
      "Hay ficha, pero todavía no activaste el acceso. No confíes en la cédula del import. Pedí el enlace a tu correo (recepción/admin), revisá nombre y cédula, y creá el PIN.",
    cedulaNoProfile: "No se pudo resolver el perfil de esa cédula.",
    profileNotFound: "Perfil no encontrado. Iniciá sesión con tu cédula.",
    saveGoal: "No se pudo guardar la meta.",
    saveProfile: "No se pudo guardar.",
    badgeNotEarned: "Solo podés fijar badges que ya ganaste.",
    badgeShowcaseFull: "Máximo 3 badges en el showcase.",
    logTraining: "No se pudo registrar el entreno.",
    reserve: "No se pudo reservar.",
    planRequired:
      "Necesitás un plan activo o tu primer día gratis. Registrate en Primer día o elegí un plan en Precios.",
    cancelReservation: "No se pudo cancelar.",
    saveMetrics: "No se pudieron guardar las medidas.",
    updatePlan: "No se pudo actualizar el plan.",
    uploadPhoto: "No se pudo subir la foto.",
    processImage: "No se pudo procesar la imagen. Intentá con otra foto.",
    sendReminder: "No se pudo enviar el aviso.",
    pinSendOtp: "No se pudo enviar el código.",
    pinOtpMissing: "Pedí el código al correo, o escribí tu teléfono/correo registrado.",
    pinMismatch: "Los PIN no coinciden.",
    pinAlreadySet: "Ya existe PIN. Ingresalo para entrar.",
    pinNotSet: "Este perfil no tiene PIN. Creá uno de 4 dígitos con el código del correo.",
    pinSetupOtpRequired:
      "Para crear el PIN pedí un código al correo verificado de la cuenta (botón Enviar código).",
    pinSetupInviteRequired:
      "No se puede crear el PIN solo con la cédula. Usá el enlace de invitación del correo o recepción.",
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
  },
} as const;
