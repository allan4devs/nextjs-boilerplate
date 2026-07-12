export type MemberWorkoutErrorCode =
  | "member_not_found"
  | "checkin_required"
  | "workout_already_completed";

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
