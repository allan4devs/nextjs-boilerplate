import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { isSession, requireMemberSession } from "@/lib/xtreme/session";
import { CHECKINS_COLLECTION, MEMBERS_COLLECTION, sanitizeWorkoutExercises, type CheckinDoc } from "@/lib/xtreme/shared";
import { assessJourney, EMPTY_JOURNEY, type JourneyState } from "@/lib/xtreme/member-journey";
import type { XtremeMemberDoc } from "@/lib/xtreme/members/types";
import { findActiveMemberVisit } from "@/lib/xtreme/member-visit";
import { completeTodayWorkout } from "@/lib/xtreme/members/complete-today-workout";
import { createMongoMemberRepository } from "@/lib/xtreme/members/repository";
import { MemberWorkoutError } from "@/lib/xtreme/members/errors";
import { businessDate } from "@/lib/xtreme/business-date";
import { recordEvent } from "@/lib/xtreme/events";
import { toPublicMember } from "@/lib/xtreme/members/presenter";

export const dynamic = "force-dynamic";
type JourneyMember = XtremeMemberDoc & { journey?: JourneyState };

async function context(memberKey: string) {
  const db = await getDb();
  const collection = db.collection<JourneyMember>(MEMBERS_COLLECTION);
  const [member, visits] = await Promise.all([
    collection.findOne({ normalizedName: memberKey }),
    db.collection<CheckinDoc>(CHECKINS_COLLECTION).find({ normalizedName: memberKey }, { projection: { id: 1, date: 1 } }).toArray(),
  ]);
  return { db, collection, member, visits };
}
function present(member: JourneyMember, visits: CheckinDoc[]) {
  const { evidence: _evidence, ...payload } = assessJourney(member.journey ?? EMPTY_JOURNEY, member.goal ?? "", member.workouts ?? [], visits);
  void _evidence;
  return payload;
}

export async function GET(req: NextRequest) {
  const session = await requireMemberSession(req);
  if (!isSession(session)) return session;
  try {
    const { member, visits } = await context(session.memberKey);
    if (!member) return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
    return NextResponse.json(present(member, visits));
  } catch {
    return NextResponse.json({ error: "No se pudo cargar tu camino. Reintentá." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await requireMemberSession(req);
  if (!isSession(session)) return session;
  try {
    const body = await req.json();
    const { db, collection, member, visits } = await context(session.memberKey);
    if (!member) return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
    const state = member.journey ?? { ...EMPTY_JOURNEY };
    if (body.version !== state.version) return NextResponse.json({ error: "Tu sesión cambió en otra pantalla. Actualizá antes de continuar." }, { status: 409 });
    const next: JourneyState = { ...state, version: state.version + 1 };
    if (body.action === "verify") {
      const assessment = assessJourney(state, member.goal ?? "", member.workouts ?? [], visits);
      if (!assessment.ready) return NextResponse.json({ error: "Todavía faltan requisitos para comprobar este nivel." }, { status: 409 });
      next.level = assessment.nextLevel;
      next.proofs = [...state.proofs, { level: next.level, verifiedAt: new Date().toISOString(), ...assessment.evidence }];
    } else if (body.action === "start") {
      const visit = await findActiveMemberVisit(db, session.memberKey);
      if (!visit) return NextResponse.json({ error: "Registrá tu ingreso antes de iniciar." }, { status: 409 });
      if (state.workout || member.activePlanWorkout) return NextResponse.json({ error: "Ya tenés un entrenamiento en curso. Retomalo." }, { status: 409 });
      if (member.workouts.some((workout) => workout.completedDate === businessDate())) return NextResponse.json({ error: "Ya guardaste el entrenamiento de hoy." }, { status: 409 });
      const trainingName = String(body.trainingName ?? "").trim().slice(0, 100);
      if (!trainingName) return NextResponse.json({ error: "Elegí qué querés trabajar." }, { status: 400 });
      next.workout = { id: crypto.randomUUID(), visitId: visit.id, trainingName, startedAt: new Date().toISOString(), exercises: [] };
    } else if (body.action === "save" || body.action === "finish") {
      if (!state.workout) return NextResponse.json({ error: "No hay un entrenamiento libre activo." }, { status: 409 });
      const exercises = sanitizeWorkoutExercises(body.exercises);
      if (body.action === "save") next.workout = { ...state.workout, exercises };
      else {
        if (!exercises.length || exercises.some((exercise) => !exercise.completed || !exercise.exerciseName || !((exercise.sets > 0 && exercise.reps > 0) || exercise.seconds > 0))) {
          return NextResponse.json({ error: "Completá los ejercicios y registrá series y repeticiones, o tiempo." }, { status: 400 });
        }
        const trainingId = `journey-${state.workout.id}`;
        // A retry after a saved workout must only close the draft, never append it again.
        if (!member.workouts.some((workout) => workout.trainingId === trainingId)) {
          await completeTodayWorkout({ repository: createMongoMemberRepository(db), recordWorkoutCompleted: async ({ memberKey, workout, checkinId }) => {
            await recordEvent(db, { type: "workout_logged", memberId: memberKey, source: "member_app", entity: { type: "workout", id: workout.id }, properties: { checkinId, minutes: workout.minutes, trainingId: workout.trainingId } });
          } }, {
            memberKey: session.memberKey, trainingId, trainingName: state.workout.trainingName,
            intensity: "Personalizado", exercises, startedAt: new Date(state.workout.startedAt),
            minutes: Math.min(240, Math.max(1, Math.round((Date.now() - new Date(state.workout.startedAt).getTime()) / 60000))),
          });
        }
        next.workout = null;
      }
    } else if (body.action === "skip-wellness") {
      const visit = await findActiveMemberVisit(db, session.memberKey);
      if (!visit) return NextResponse.json({ error: "No hay una visita activa." }, { status: 409 });
      next.wellnessSkippedFor = visit.id;
    } else if (body.action === "cancel") next.workout = null;
    else return NextResponse.json({ error: "Acción inválida." }, { status: 400 });

    const result = await collection.updateOne({ normalizedName: session.memberKey, ...(body.action === "start" ? { activePlanWorkout: { $exists: false } } : {}), ...(member.journey ? { "journey.version": state.version } : { journey: { $exists: false } }) }, { $set: { journey: next, updatedAt: new Date() } });
    if (!result.modifiedCount) return NextResponse.json({ error: "Hubo otro cambio. Actualizá tu camino y reintentá." }, { status: 409 });
    const refreshed = await collection.findOne({ normalizedName: session.memberKey });
    return NextResponse.json({ ...present(refreshed!, visits), ...(body.action === "finish" ? { member: toPublicMember(refreshed, businessDate()) } : {}) });
  } catch (error) {
    if (error instanceof MemberWorkoutError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "No se pudo guardar tu camino. Reintentá." }, { status: 500 });
  }
}
