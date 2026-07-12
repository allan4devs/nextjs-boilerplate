/**
 * Mensajes de cara al socio del Member OS.
 * Todo el feedback (errores y confirmaciones) vive aqui para mantener
 * el tono en un solo lugar. Convencion: sin tildes, igual que el resto
 * de los textos del OS.
 */

export const MSG = {
  errors: {
    /** Fetch fallido (sin internet o servidor caido): nunca mostrar "Failed to fetch". */
    offline: "Sin conexion, mae. Revise su internet y vuelva a intentar en un toque.",
    /** El servidor respondio con error pero sin mensaje utilizable. */
    server: "El servidor anda fallando. Intente de nuevo en un momento.",
    sessionExpired: "Su sesion vencio. Ingrese el PIN para continuar.",
    loadApp: "No pude cargar Xtreme Gym. Intente de nuevo.",
    cedulaTooShort: (minDigits: number) => `Digite o escanee la cedula (minimo ${minDigits} digitos).`,
    cedulaNotRegistered:
      "Cedula no registrada. Escriba su nombre y telefono para crear el perfil, o pida el alta en recepcion.",
    cedulaNoProfile: "No se pudo resolver el perfil de esa cedula.",
    profileNotFound: "Perfil no encontrado. Inicie sesion con su cedula.",
    saveGoal: "No se pudo guardar la meta.",
    saveProfile: "No se pudo guardar.",
    badgeNotEarned: "Solo puede fijar badges que ya gano.",
    badgeShowcaseFull: "Maximo 3 badges en el showcase.",
    logTraining: "No se pudo registrar el entreno.",
    reserve: "No se pudo reservar.",
    planRequired:
      "Necesita un plan activo o su primer dia gratis. Registrese en Primer dia o elija un plan en Precios.",
    cancelReservation: "No se pudo cancelar.",
    saveMetrics: "No se pudieron guardar las medidas.",
    updatePlan: "No se pudo actualizar el plan.",
    uploadPhoto: "No se pudo subir la foto.",
    processImage: "No se pudo procesar la imagen. Intente con otra foto.",
    sendReminder: "No se pudo enviar el aviso.",
    pinSendOtp: "No se pudo enviar el codigo.",
    pinOtpMissing: "Pida el codigo al correo, o escriba su telefono/correo registrado.",
    pinMismatch: "Los PIN no coinciden.",
    pinAlreadySet: "Ya existe PIN. Ingreselo para entrar.",
    pinNotSet: "Este perfil no tiene PIN. Cree uno de 4 digitos.",
    pinWrong: "PIN incorrecto.",
    pinValidate: "No se pudo validar el PIN.",
  },
  ok: {
    weeklyGoal: (days: number) => `Meta semanal: ${days} dias. A cumplirla.`,
    profileSaved: "Perfil actualizado. Ahora si, a meterle.",
    badgeShowcaseSaved: "Showcase de badges actualizado.",
    emailPrefsSaved: "Preferencias de correo guardadas.",
    trainingLogged: (name: string) => `Registrado: ${name}. Racha viva, mae.`,
    reserved: (name: string) => `Reservado: ${name}. Llegue 5 minutos antes, pura vida.`,
    reservationCanceled: (name: string) => `Reserva cancelada: ${name}.`,
    metricsSaved: "Medidas guardadas. Progreso visible, sin cuentos.",
    planItemDone: "Sesion del plan completada. Sigalo asi.",
    planItemPending: "Sesion marcada como pendiente.",
    photoSaved: "Foto de perfil actualizada.",
    reminderSent: (sentTo: string) => `Aviso enviado a ${sentTo}. Revise su correo.`,
    otpSent: (maskedEmail: string, expiresInMin: number) =>
      `Codigo enviado a ${maskedEmail} (vence en ${expiresInMin} min).`,
    pinChanged: "PIN actualizado. Sesion protegida.",
    pinRecovered: "PIN recuperado. Guardelo bien para la proxima.",
  },
} as const;
