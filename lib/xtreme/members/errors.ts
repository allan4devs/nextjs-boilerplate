export type MemberWorkoutErrorCode =
  | "member_not_found"
  | "checkin_required"
  | "workout_already_completed"
  | "class_reservation_required"
  | "class_checkin_too_early"
  | "class_checkin_ended"
  | "class_not_today";

export type MemberWorkoutErrorStatus = 403 | 404 | 409;

export class MemberWorkoutError extends Error {
  constructor(
    message: string,
    readonly code: MemberWorkoutErrorCode,
    readonly status: MemberWorkoutErrorStatus,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class MemberNotFoundError extends MemberWorkoutError {
  constructor() {
    super("Perfil no encontrado.", "member_not_found", 404);
  }
}

export class MissingTodayCheckinError extends MemberWorkoutError {
  constructor() {
    super(
      "Primero registrá tu ingreso al gym para completar el entreno de hoy.",
      "checkin_required",
      403,
    );
  }
}

export class TodayWorkoutAlreadyCompletedError extends MemberWorkoutError {
  constructor() {
    super(
      "El entreno de hoy ya estaba marcado.",
      "workout_already_completed",
      409,
    );
  }
}

export class ClassReservationRequiredError extends MemberWorkoutError {
  constructor() {
    super(
      "Para hacer check-in a esta clase tenés que reservarla antes.",
      "class_reservation_required",
      403,
    );
  }
}

export class ClassCheckInTooEarlyError extends MemberWorkoutError {
  constructor() {
    super(
      "El check-in de la clase todavía no está abierto. Llegá un rato antes del horario.",
      "class_checkin_too_early",
      409,
    );
  }
}

export class ClassCheckInEndedError extends MemberWorkoutError {
  constructor() {
    super(
      "Esta clase ya terminó. No se puede hacer check-in después del horario.",
      "class_checkin_ended",
      409,
    );
  }
}

export class ClassCheckInNotTodayError extends MemberWorkoutError {
  constructor() {
    super(
      "Esta clase no se imparte hoy.",
      "class_not_today",
      409,
    );
  }
}
