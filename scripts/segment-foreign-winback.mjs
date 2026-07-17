/**
 * Segmenta socios: posibles extranjeros + win-back por antigüedad de vencimiento.
 * Dry-run / solo lectura. Exporta JSON + CSV en scripts/.
 *
 *   node --env-file=.env scripts/segment-foreign-winback.mjs
 */
import { writeFile } from "node:fs/promises";
import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) throw new Error("Falta MONGODB_URI");

const clean = (v) => String(v ?? "").trim().replace(/\s+/g, " ");
const digits = (v) => clean(v).replace(/\D/g, "");
const todayIso = new Date().toISOString().slice(0, 10);

function daysSince(iso) {
  if (!iso) return null;
  const t = Date.parse(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.parse(`${todayIso}T00:00:00Z`) - t) / 86_400_000);
}

/** Apellidos anglo/germánicos poco comunes en CR (señal fuerte). */
const ANGLO_GERMANIC =
  /\b(HOFFMEISTER|JOHANSSON|SCHMIDT|SCHNEIDER|MULLER|MUELLER|WEBER|WAGNER|BECKER|HOFFMAN|HOFFMANN|MEYER|KLEIN|WOLF|SMITH|JONES|WILLIAMS|BROWN|MILLER|WILSON|THOMAS|JACKSON|ANDERSON|TAYLOR|MOORE|WHITE|HARRIS|CLARK|LEWIS|ROBINSON|WALKER|YOUNG|ALLEN|KING|WRIGHT|SCOTT|GREEN|BAKER|ADAMS|NELSON|HILL|CAMPBELL|MITCHELL|ROBERTS|CARTER|PHILLIPS|EVANS|TURNER|PARKER|COLLINS|EDWARDS|STEWART|MORRIS|MURPHY|COOK|ROGERS|MORGAN|COOPER|RICHARDSON|COX|HOWARD|WARD|PETERSON|GRAY|JAMES|WATSON|BROOKS|KELLY|SANDERS|PRICE|BENNETT|WOOD|BARNES|ROSS|HENDERSON|COLEMAN|JENKINS|PERRY|POWELL|LONG|PATTERSON|HUGHES|BUTLER|SIMMONS|FOSTER|BRYANT|ALEXANDER|RUSSELL|GRIFFIN|HAYES|MYERS|FORD|HAMILTON|GRAHAM|SULLIVAN|WALLACE|WOODS|COLE|WEST|OWENS|REYNOLDS|FISHER|ELLIS|HARRISON|GIBSON|MCDONALD|MARSHALL|MURRAY|FREEMAN|WELLS|WEBB|SIMPSON|STEVENS|TUCKER|PORTER|HUNTER|HICKS|CRAWFORD|HENRY|BOYD|MASON|KENNEDY|WARREN|DIXON|BURNS|GORDON|SHAW|HOLMES|RICE|ROBERTSON|HUNT|BLACK|DANIELS|PALMER|MILLS|NICHOLS|GRANT|KNIGHT|FERGUSON|ROSE|STONE|HAWKINS|DUNN|PERKINS|HUDSON|SPENCER|GARDNER|STEPHENS|PAYNE|PIERCE|BERRY|MATTHEWS|ARNOLD|WAGNER|WILLIS|RAY|WATKINS|OLSON|CARROLL|DUNCAN|SNYDER|HART|CUNNINGHAM|BRADLEY|LANE|ANDREWS|HARPER|FOX|RILEY|ARMSTRONG|CARPENTER|WEAVER|GREENE|LAWRENCE|ELLIOTT|SIMS|AUSTIN|PETERS|KELLEY|FRANKLIN|LAWSON|FIELDS|RYAN|SCHMIDT|CARR|WHEELER|CHAPMAN|OLIVER|MONTGOMERY|RICHARDS|WILLIAMSON|JOHNSTON|BANKS|MEYER|BISHOP|MCCOY|HOWELL|MORRISON|HANSEN|HARVEY|LITTLE|BURTON|STANLEY|NGUYEN|GEORGE|JACOBS|REID|KIM|FULLER|LYNCH|DEAN|GILBERT|GARRETT|WELCH|LARSON|FRAZIER|BURKE|HANSON|DAY|BOWMAN|FOWLER|BREWER|HOFFMAN|CARLSON|PEARSON|HOLLAND|DOUGLAS|FLEMING|JENSEN|BYRD|DAVIDSON|HOPKINS|MAY|TERRY|WADE|WALTERS|CURTIS|NEAL|CALDWELL|LOWE|JENNINGS|BARNETT|GRAVES|HORTON|SHELTON|BARRETT|OBRIEN|SUTTON|GREGORY|MCKINNEY|LUCAS|MILES|CRAIG|CHAMBERS|HOLT|LAMBERT|FLETCHER|WATTS|BATES|HALE|RHODES|BECK|NEWMAN|HAYNES|MCDANIEL|BUSH|VAUGHN|PARKS|DAWSON|NORRIS|HARDY|LOVE|STEELE|CURRY|POWERS|SCHULTZ|BARKER|PAGE|BALL|KELLER|CHANDLER|WEBER|LEONARD|WALSH|LYONS|RAMSEY|WOLFE|SCHNEIDER|MULLINS|BENSON|SHARP|BOWEN|DANIEL|BARBER|CUMMINGS|HINES|BALDWIN|GRIFFITH|HUBBARD|REEVES|WARNER|STEVENSON|BURGESS|TATE|CROSS|GARNER|MANN|MACK|MOSS|THORNTON|DENNIS|MCGEE|FARMER|GLOVER|MANNING|COHEN|HARMON|RODGERS|ROBBINS|NEWTON|TODD|BLAIR|HIGGINS|INGRAM|REESE|CANNON|STRICKLAND|TOWNSEND|POTTER|GOODWIN|WALTON|ROWE|HAMPTON|PATTON|SWANSON|JOSEPH|FRANCIS|GOODMAN|YATES|BECKER|ERICKSON|HODGES|CONNER|ADKINS|WEBSTER|NORMAN|MALONE|HAMMOND|FLOWERS|COBB|MOODY|QUINN|BLAKE|MAXWELL|POPE|FLOYD|OSBORNE|PAUL|MCCARTHY|LINDSEY|GIBBS|TYLER|GROSS|FITZGERALD|STOKES|DOYLE|SHERMAN|SAUNDERS|WISE|GILL|GREER|SIMON|WATERS|BALLARD|SCHWARTZ|MCBRIDE|HOUSTON|CHRISTENSEN|KLEIN|PRATT|BRIGGS|PARSONS|MCLAUGHLIN|ZIMMERMAN|FRENCH|BUCHANAN|MORAN|COPELAND|ROY|PITTMAN|BRADY|MCCORMICK|HOLLOWAY|BROCK|POOLE|FRANK|LOGAN|OWEN|BASS|MARSH|DRAKE|WONG|JEFFERSON|PARK|MORTON|ABBOTT|SPARKS|PATRICK|NORTON|HUFF|CLAYTON|MASSEY|LLOYD|CARSON|BOWERS|ROBERSON|BARTON|TRAN|LAMB|HARRINGTON|CASEY|BOONE|CLARKE|MATHIS|SINGLETON|WILKINS|CAIN|BRYAN|UNDERWOOD|HOGAN|MCKENZIE|COLLIER|PHELPS|MCGUIRE|ALLISON|BRIDGES|WILKERSON|NASH|SUMMERS|ATKINS)\b/i;

/** Nombres de pila frecuentes en población migrante (heurística CR). */
const MIGRANT_FIRST =
  /\b(YOANGEL|ENGELS|BISMARK|ARAFAT|YORLENY|YORLENI|KEYLOR|KEYLIN|CRISTOFER|CHRISTOFER|YENDRY|YENDRI|YERLIN|ANYELINE|ANYELIN|WILMER|WILBERTH|WILBER|MAIKEL|MAYKEL|YUNIOR|YOSTIN|JOSTIN|KEILYN|KEILIN|YARIEL|WILFREDO|ROSMERY|ROSMERI|YEISON|JEYSON|JEISON|STAELE|HANIA|GEORGINELLA)\b/i;

function classifyCedula(ced) {
  const d = digits(ced);
  if (!d) return { tag: "missing", score: 0 };
  if (d.length <= 5) return { tag: "garbage", score: 0 };
  // DIMEX / documento extranjero CR suele 11–12 dígitos
  if (d.length >= 11 && d.length <= 12) return { tag: "dimex_likely", score: 3 };
  if (d.length === 10) return { tag: "doc_10_digits", score: 2 };
  // 8 dígitos: a menudo cédula extranjera/residencia mal capturada o nicaragüense
  if (d.length === 8) return { tag: "cedula_8_digits", score: 2 };
  if (d.length === 9 && /^[1-7]/.test(d)) return { tag: "cr_nacional", score: 0 };
  if (d.length === 9) return { tag: "cr_9_odd", score: 1 };
  if (d.length === 7) return { tag: "short_7", score: 1 };
  return { tag: "other", score: 1 };
}

function classifyName(name) {
  const n = clean(name).toLocaleUpperCase("es-CR");
  let score = 0;
  const reasons = [];
  if (ANGLO_GERMANIC.test(n)) {
    score += 3;
    reasons.push("apellido_anglo_germanico");
  }
  if (MIGRANT_FIRST.test(n)) {
    score += 2;
    reasons.push("nombre_migrante_comun");
  }
  return { score, reasons };
}

function toCsv(rows) {
  const headers = [
    "name",
    "cedula",
    "cedTag",
    "foreignScore",
    "email",
    "phone",
    "daysExpired",
    "startedAt",
    "nextBillingDate",
    "plan",
    "status",
    "nameSignals",
  ];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((k) => esc(k === "nameSignals" ? (r.nameSignals || []).join("|") : r[k]))
        .join(","),
    ),
  ].join("\n");
}

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15_000 });
await client.connect();
const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
const members = await db
  .collection("xtreme_gym_members")
  .find(
    {},
    {
      projection: {
        memberName: 1,
        normalizedName: 1,
        cedula: 1,
        email: 1,
        emailVerified: 1,
        phone: 1,
        membership: 1,
        workouts: 1,
      },
    },
  )
  .toArray();
const contacts = await db
  .collection("xtreme_gym_email_contacts")
  .find({ status: "active" })
  .project({ email: 1 })
  .toArray();
const contactEmails = new Set(contacts.map((c) => clean(c.email).toLowerCase()).filter(Boolean));

const foreign = [];
const winback = { d90_179: [], d180_364: [], d365: [], ancient_never_app: [] };

for (const m of members) {
  const name = m.memberName || m.normalizedName || "";
  const cedInfo = classifyCedula(m.cedula);
  const nameInfo = classifyName(name);
  const foreignScore = cedInfo.score + nameInfo.score;
  const nextBill = m.membership?.nextBillingDate || "";
  const started = m.membership?.startedAt || "";
  const daysExpired = daysSince(nextBill);
  const daysSinceStart = daysSince(started);
  const lastWorkout = (m.workouts || [])
    .map((w) => w.completedDate)
    .filter(Boolean)
    .sort()
    .at(-1);
  const email = clean(m.email).toLowerCase();
  const row = {
    name,
    key: m.normalizedName,
    cedula: digits(m.cedula),
    cedTag: cedInfo.tag,
    nameSignals: nameInfo.reasons,
    foreignScore,
    email,
    emailVerified: Boolean(m.emailVerified),
    inContactList: email ? contactEmails.has(email) : false,
    phone: clean(m.phone),
    plan: m.membership?.plan || "",
    status: m.membership?.status || "",
    nextBillingDate: nextBill,
    startedAt: started,
    daysExpired,
    daysSinceStart,
    lastWorkout: lastWorkout || null,
  };

  if (foreignScore >= 2 && cedInfo.tag !== "garbage") foreign.push(row);

  if (m.membership?.status === "expired" && daysExpired != null) {
    if (daysExpired >= 365) winback.d365.push(row);
    else if (daysExpired >= 180) winback.d180_364.push(row);
    else if (daysExpired >= 90) winback.d90_179.push(row);
  }
  if (
    daysSinceStart != null &&
    daysSinceStart >= 730 &&
    !lastWorkout &&
    (daysExpired == null || daysExpired >= 180)
  ) {
    winback.ancient_never_app.push(row);
  }
}

foreign.sort((a, b) => b.foreignScore - a.foreignScore || (b.daysExpired || 0) - (a.daysExpired || 0));
for (const key of Object.keys(winback)) {
  winback[key].sort((a, b) => (b.daysExpired || 0) - (a.daysExpired || 0));
}

const totals = {
  members: members.length,
  possibleForeign: foreign.length,
  foreignWithEmail: foreign.filter((f) => f.email).length,
  foreignWithPhone: foreign.filter((f) => f.phone).length,
  foreignInContactList: foreign.filter((f) => f.inContactList).length,
  winback_90_179: winback.d90_179.length,
  winback_180_364: winback.d180_364.length,
  winback_365_plus: winback.d365.length,
  ancient_2y_no_workout: winback.ancient_never_app.length,
  winback90_withEmail: winback.d90_179.filter((f) => f.email).length,
  winback180_withEmail: winback.d180_364.filter((f) => f.email).length,
  winback365_withEmail: winback.d365.filter((f) => f.email).length,
  winback90_withPhone: winback.d90_179.filter((f) => f.phone).length,
  winback180_withPhone: winback.d180_364.filter((f) => f.phone).length,
  winback365_withPhone: winback.d365.filter((f) => f.phone).length,
  emailContacts: contacts.length,
};

const foreignByTag = foreign.reduce((acc, f) => {
  acc[f.cedTag] = (acc[f.cedTag] || 0) + 1;
  return acc;
}, {});

await writeFile(
  "scripts/segment-foreign-winback.json",
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      totals,
      foreignByTag,
      foreign,
      winback_90_179: winback.d90_179,
      winback_180_364: winback.d180_364,
      winback_365_plus: winback.d365,
      ancient_2y_no_workout: winback.ancient_never_app,
    },
    null,
    2,
  ),
  "utf8",
);
await writeFile("scripts/segment-possible-foreigners.csv", toCsv(foreign), "utf8");
await writeFile("scripts/segment-winback-90.csv", toCsv(winback.d90_179), "utf8");
await writeFile("scripts/segment-winback-180.csv", toCsv(winback.d180_364), "utf8");
await writeFile("scripts/segment-winback-365.csv", toCsv(winback.d365), "utf8");

console.log(
  JSON.stringify(
    {
      totals,
      foreignByTag,
      topForeign: foreign.slice(0, 25).map((f) => ({
        name: f.name,
        cedula: f.cedula,
        tag: f.cedTag,
        score: f.foreignScore,
        signals: f.nameSignals,
        daysExpired: f.daysExpired,
        email: f.email || "(sin correo)",
        phone: f.phone || "",
      })),
      winback365: winback.d365.slice(0, 15).map((f) => ({
        name: f.name,
        daysExpired: f.daysExpired,
        started: f.startedAt,
        email: f.email || "(sin)",
        phone: f.phone || "",
      })),
      winback180: winback.d180_364.slice(0, 10).map((f) => ({
        name: f.name,
        daysExpired: f.daysExpired,
        email: f.email || "(sin)",
        phone: f.phone || "",
      })),
      winback90: winback.d90_179.slice(0, 10).map((f) => ({
        name: f.name,
        daysExpired: f.daysExpired,
        email: f.email || "(sin)",
        phone: f.phone || "",
      })),
      files: [
        "scripts/segment-foreign-winback.json",
        "scripts/segment-possible-foreigners.csv",
        "scripts/segment-winback-90.csv",
        "scripts/segment-winback-180.csv",
        "scripts/segment-winback-365.csv",
      ],
    },
    null,
    2,
  ),
);

await client.close();
