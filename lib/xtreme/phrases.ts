/**
 * Xtreme Gym — Frases motivacionales por contexto.
 * Eleccion deterministica por (nombre + fecha + contexto): se siente
 * personal, no se repite el mismo dia y no requiere infraestructura.
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
    "Hoy es un buen dia para ser mas fuerte que ayer.",
    "El gym no se gana en un dia. Se gana todos los dias.",
    "Usted no vino a mirar maquinas. A meterle.",
    "Cada visita suma. Cada excusa resta.",
    "La constancia le gana al talento cuando el talento no llega.",
    "Nadie se arrepiente de haber entrenado.",
    "Pura vida, pero primero pura fuerza.",
    "El cuerpo logra lo que la mente cree.",
    "Un dia mas entrenando es un dia menos empezando de cero.",
    "La disciplina pesa gramos. El arrepentimiento pesa toneladas.",
  ],
  postWorkout: [
    "Entreno marcado. Eso ya lo pone por encima del 90%.",
    "Hecho. El sofa puede esperar, la racha no.",
    "Otro ladrillo en el muro. Tremendo.",
    "Listo por hoy. Su yo del futuro se lo agradece.",
    "Sumado. Asi se construye una leyenda: un dia a la vez.",
    "Boom. Un entreno mas cerca de su meta.",
    "Eso estuvo fino. Manana repetimos.",
    "Marcado y guardado. Nadie se lo quita.",
    "Su racha esta feliz. Usted deberia tambien.",
    "Hoy gano la disciplina. Como debe ser.",
  ],
  streakRisk: [
    "Su racha de {streak} dias esta en juego hoy. No la deje morir.",
    "Hoy no ha marcado. La racha de {streak} dias lo esta esperando.",
    "{streak} dias de racha. Seria una lastima... que la perdiera hoy.",
    "La racha no se cuida sola. Hoy toca, aunque sea suave.",
    "Un entreno corto hoy salva {streak} dias de esfuerzo.",
    "Media hora hoy vale mas que empezar de cero manana.",
    "Su racha de {streak} dias pregunta por usted.",
  ],
  streakSafe: [
    "{streak} dias de racha. Modo bestia activado.",
    "Racha de {streak} dias viva y coleando. Siga asi.",
    "{streak} dias seguidos. Esto ya es un estilo de vida.",
    "La racha va en {streak}. El que aguanta, gana.",
    "{streak} dias. Ya no es motivacion, es habito.",
  ],
  comeback: [
    "Volvio. Eso es lo que importa.",
    "Lo mejor del gym: siempre lo recibe de vuelta.",
    "Dia uno otra vez. Y eso esta perfecto.",
    "Caerse esta permitido. Quedarse en el suelo no.",
    "La racha murio. Viva la racha nueva.",
    "Empezar de nuevo tambien es de valientes.",
  ],
  morning: [
    "Madrugar para entrenar: el poder mas subestimado.",
    "Gana la manana y gana el dia.",
    "Cafe, gym y a comerse el mundo.",
    "Entrenar temprano: menos gente, mas resultados.",
  ],
  evening: [
    "Cierre el dia como un campeon: entrenando.",
    "El estres del dia se queda en la ultima repeticion.",
    "Noche de gym > noche de excusas.",
    "Ultimo esfuerzo del dia. El mejor.",
  ],
  milestone: [
    "HITO DESBLOQUEADO. Esto hay que celebrarlo.",
    "Numeros redondos, esfuerzo real. Felicidades.",
    "Esto ya es otro nivel. Literalmente.",
    "Pocos llegan aqui. Usted si.",
  ],
  levelUp: [
    "SUBIO DE NIVEL. El gym entero lo siente.",
    "Nuevo nivel desbloqueado. Siga rompiendo.",
    "Nivel nuevo, retos nuevos. Vamos.",
  ],
  rest: [
    "Descansar tambien es entrenar. El musculo crece durmiendo.",
    "Dia de descanso ganado. Manana volvemos.",
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
