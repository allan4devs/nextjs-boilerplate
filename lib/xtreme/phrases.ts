/**
 * Xtreme Gym - Frases motivacionales por contexto.
 * Eleccion deterministica por (nombre + fecha + contexto): se siente
 * personal, no se repite el mismo dia y no requiere infraestructura.
 * Tono: tico sancarleno, profesional, voseo natural (podés, tenés, seguí).
 */

export type PhraseContext =
  | "welcome"
  | "postWorkout"
  | "streakRisk"
  | "streakSafe"
  | "comeback"
  | "morning"
  | "evening"
  | "milestone"
  | "levelUp"
  | "rest";

const PHRASES: Record<PhraseContext, string[]> = {
  welcome: [
    "Hoy es un buen día para ser más fuerte que ayer.",
    "El gym no se gana en un día. Se gana todos los días.",
    "No viniste a mirar máquinas. A meterle.",
    "Cada visita suma. Cada excusa resta.",
    "La constancia le gana al talento cuando el talento no llega.",
    "Nadie se arrepiente de haber entrenado.",
    "Pura vida, pero primero pura fuerza.",
    "El cuerpo logra lo que la mente cree.",
    "Un día más entrenando es un día menos empezando de cero.",
    "La disciplina pesa gramos. El arrepentimiento pesa toneladas.",
  ],
  postWorkout: [
    "Entreno marcado. Eso ya te pone por encima del 90%.",
    "Hecho. El sofá puede esperar, la racha no.",
    "Otro ladrillo en el muro. Tremendo.",
    "Listo por hoy. Tu yo del futuro te lo agradece.",
    "Sumado. Así se construye una leyenda: un día a la vez.",
    "Boom. Un entreno más cerca de tu meta.",
    "Eso estuvo fino. Mañana repetimos.",
    "Marcado y guardado. Nadie te lo quita.",
    "Tu racha está feliz. Vos también deberías.",
    "Hoy ganó la disciplina. Como debe ser.",
  ],
  streakRisk: [
    "Tu racha de {streak} días está en juego hoy. No la dejes morir.",
    "Hoy no has marcado. La racha de {streak} días te está esperando.",
    "{streak} días de racha. Sería una lástima... que la perdieras hoy.",
    "La racha no se cuida sola. Hoy toca, aunque sea suave.",
    "Un entreno corto hoy salva {streak} días de esfuerzo.",
    "Media hora hoy vale más que empezar de cero mañana.",
    "Tu racha de {streak} días pregunta por vos.",
  ],
  streakSafe: [
    "{streak} días de racha. Modo bestia activado.",
    "Racha de {streak} días viva y coleando. Seguí así.",
    "{streak} días seguidos. Esto ya es un estilo de vida.",
    "La racha va en {streak}. El que aguanta, gana.",
    "{streak} días. Ya no es motivación, es hábito.",
  ],
  comeback: [
    "Volviste. Eso es lo que importa.",
    "Lo mejor del gym: siempre te recibe de vuelta.",
    "Día uno otra vez. Y eso está perfecto.",
    "Caerse está permitido. Quedarse en el suelo no.",
    "La racha murió. Viva la racha nueva.",
    "Empezar de nuevo también es de valientes.",
  ],
  morning: [
    "Madrugar para entrenar: el poder más subestimado.",
    "Ganá la mañana y ganá el día.",
    "Café, gym y a comerse el mundo.",
    "Entrenar temprano: menos gente, más resultados.",
  ],
  evening: [
    "Cerrá el día como un campeón: entrenando.",
    "El estrés del día se queda en la última repetición.",
    "Noche de gym > noche de excusas.",
    "Último esfuerzo del día. El mejor.",
  ],
  milestone: [
    "HITO DESBLOQUEADO. Esto hay que celebrarlo.",
    "Números redondos, esfuerzo real. Felicidades.",
    "Esto ya es otro nivel. Literalmente.",
    "Pocos llegan aquí. Vos sí.",
  ],
  levelUp: [
    "SUBISTE DE NIVEL. El gym entero lo siente.",
    "Nuevo nivel desbloqueado. Seguí rompiendo.",
    "Nivel nuevo, retos nuevos. Vamos.",
  ],
  rest: [
    "Descansar también es entrenar. El músculo crece durmiendo.",
    "Día de descanso ganado. Mañana volvemos.",
    "Recuperar es parte del plan, no una excusa.",
  ],
};

function hashString(value: string) {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

/** Frase deterministica del dia para un contexto dado. */
export function pickPhrase(
  context: PhraseContext,
  memberName: string,
  vars: { streak?: number } = {},
  date = new Date().toISOString().slice(0, 10),
) {
  const pool = PHRASES[context] ?? PHRASES.welcome;
  const phrase = pool[hashString(`${memberName}|${date}|${context}`) % pool.length];
  return phrase.replace(/\{streak\}/g, String(vars.streak ?? 0));
}
