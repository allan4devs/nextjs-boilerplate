# Conexiones entre plano y máquinas

## Organización por categorías (septiembre 2026)

- Recepción izquierda, derecha y zona central se agrupan en **Tren superior (TS)**. Las máquinas de cardio de esas zonas pasan a **Cardio (CA)**; las dos fichas Core pasan a **Abs (AB)**.
- El plano divide cada área en cuadrantes según `zone` de la ficha; Piernas usa el primer músculo del catálogo. No se deduce la categoría del nombre editable. Las demás áreas usan PI, PA, PB y PD.
- Los códigos anteriores se migran por `assetId`; se conservan los códigos personalizados y todos los alias QR ya impresos.
- `areaLayoutRevision: 2` aplica la nueva distribución una sola vez a planos anteriores. Mantiene nombres, tamaños, bloqueos, activos sin ubicar y elementos personalizados; los movimientos posteriores se conservan. El editor respalda el JSON anterior en `xtreme:machines-floor-plan:v1:before-area-reorganization` antes de migrarlo.
- `node scripts/check-floor-area-layout.mjs` verifica códigos, cuadrantes, límites, superposiciones y movimiento/reorganización de áreas anidadas.
- `node --env-file=.env --env-file=.env.local scripts/migrate-floor-areas.mjs` revisa Mongo sin escribir. `--apply` migra con control de concurrencia y respaldo en `xtreme_gym_floor_plan_migrations`. La ejecución de esta actualización modificó 82 activos; la revisión posterior devolvió cero cambios pendientes. No había plano `main` en Mongo: la copia del navegador se migra al abrir el editor y se guarda con la sesión admin.

Comparación del inventario versionado. Las etiquetas corregidas en localStorage se leen desde el navegador donde se editaron; no se han recuperado ni publicado durante esta auditoría.

Las páginas de plano, catálogo, ficha y QR ahora consultan la misma proyección del inventario compartido (sin costos, facturas, números de serie ni datos administrativos). Si falla la lectura, las páginas muestran que usan la copia inicial; el destino de un QR de unidad requiere una lectura compartida válida.

- El enlace entre sistemas es `asset.id` / `assetId`, nunca el nombre ni el código editable.
- En plano se pueden guardar nombre, código y ficha vinculada mediante la sesión admin existente. La ficha se valida contra el catálogo.
- Las etiquetas nuevas usan `/maquinas/equipo/<assetId>`; esta ruta resuelve la ficha vigente y conserva la unidad seleccionada. Los QR anteriores de guía y sus alias siguen funcionando.
- Plano y etiquetas editan el mismo nombre y código por `assetId`, guardados en `xtreme:machine-labels:v1`. Los cambios se reflejan automáticamente entre vistas y pestañas, sin importar manualmente. El inventario central conserva el guardado explícito con sesión admin.
- La primera lectura recupera los borradores anteriores: las correcciones del plano tienen prioridad; se conservan también las correcciones exclusivas del editor QR. Las posiciones y el orden de impresión siguen separados del nombre. Quitar una unidad del plano, moverla o deshacer movimientos no revierte su nombre compartido. Los códigos vacíos y repetidos permanecen visibles para revisión.
- Verificación de sincronización de nombres/códigos, migración, recarga, unidades sin ubicar y fallos de almacenamiento: `node scripts/check-machine-label-sync.mjs`.
- Los elementos personalizados del plano no se convierten automáticamente en activos físicos. Se listan como pendientes de asociación para evitar inventar identidades.
- Verificación de conexiones, QR únicos y conservación de etiquetas/códigos al guardar el plano: `node scripts/check-machine-connections.mjs`.

| Activo | Nombre del inventario/plano inicial | Ficha |
| --- | --- | --- |
| eq-001 | Glúteo / extensión de cadera | [Glúteo / extensión de cadera](/maquinas/glute-hip-extension) |
| eq-002 | Hip Abductor | [Abductor de cadera](/maquinas/hip-abductor) |
| eq-003 | Abductor / Aductor (dual) | [Abductor / Aductor combinado](/maquinas/hip-abductor-aductor-dual) |
| eq-004 | Sentadilla péndulo | [Sentadilla péndulo](/maquinas/pendulum-squat) |
| eq-005 | Prensa inclinada | [Prensa inclinada](/maquinas/leg-press-incline) |
| eq-006 | Prensa horizontal | [Prensa horizontal](/maquinas/horizontal-leg-press) |
| eq-007 | Sentadilla acostado | [Sentadilla acostado](/maquinas/lying-squat) |
| eq-008 | Leg Extension | [Extensión de cuádriceps](/maquinas/leg-extension) |
| eq-009 | Leg Extension | [Extensión de cuádriceps](/maquinas/leg-extension) |
| eq-010 | Leg Curl sentado | [Curl femoral sentado](/maquinas/leg-curl) |
| eq-011 | Leg Curl + Leg Extension (dual) | [Leg Curl + Leg Extension combinado](/maquinas/leg-curl-extension-dual) |
| eq-012 | Leg Curl acostado (camilla) | [Leg Curl acostado (camilla)](/maquinas/lying-leg-curl) |
| eq-013 | Máquina Smith libre | [Máquina Smith](/maquinas/smith-machine) |
| eq-014 | Sentadilla potro | [Sentadilla potro](/maquinas/sentadilla-potro) |
| eq-015 | Pantorrilla horizontal | [Pantorrilla horizontal](/maquinas/calf-press-horizontal) |
| eq-016 | Sissy Squats | [Sissy Squats](/maquinas/sissy-squat) |
| eq-017 | Hack Squat | [Hack Squat](/maquinas/hack-squat) |
| eq-018 | Sentadilla Perfecta | [Sentadilla Perfecta](/maquinas/sentadilla-perfecta) |
| eq-019 | Máquina pequeña, tubo con pesas en extremos | [Máquina de tubo con pesas (por identificar)](/maquinas/tubo-pesas-pendiente) |
| eq-020 | Máquina de pie tipo multi-estación | [Multi-estación de pie (por identificar)](/maquinas/multiestacion-pie-pendiente) |
| eq-021 | Hip Thrust (rack con plataforma) | [Hip Thrust (rack con plataforma)](/maquinas/hip-thrust) |
| eq-022 | Hip Abduction | [Abductor de cadera](/maquinas/hip-abductor) |
| eq-078 | Cinta de correr (caminadora) #1 | [Cinta de correr](/maquinas/treadmill) |
| eq-079 | Cinta de correr (caminadora) #2 | [Cinta de correr](/maquinas/treadmill) |
| eq-080 | Cinta de correr (caminadora) #3 | [Cinta de correr](/maquinas/treadmill) |
| eq-081 | Cinta de correr (caminadora) #4 | [Cinta de correr](/maquinas/treadmill) |
| eq-082 | Cinta de correr (caminadora) #5 | [Cinta de correr](/maquinas/treadmill) |
| eq-083 | Cinta de correr (caminadora) #6 | [Cinta de correr](/maquinas/treadmill) |
| eq-084 | Cinta de correr (caminadora) #7 | [Cinta de correr](/maquinas/treadmill) |
| eq-085 | Cinta de correr (caminadora) #8 | [Cinta de correr](/maquinas/treadmill) |
| eq-086 | Cinta de correr (caminadora) #9 | [Cinta de correr](/maquinas/treadmill) |
| eq-087 | Cinta de correr (caminadora) #10 | [Cinta de correr](/maquinas/treadmill) |
| eq-088 | Cinta de correr (caminadora) #11 | [Cinta de correr](/maquinas/treadmill) |
| eq-089 | Cinta de correr (caminadora) #12 | [Cinta de correr](/maquinas/treadmill) |
| eq-090 | Cinta de correr (caminadora) #13 | [Cinta de correr](/maquinas/treadmill) |
| eq-091 | Cinta de correr (caminadora) #14 | [Cinta de correr](/maquinas/treadmill) |
| eq-092 | Cinta de correr (caminadora) - otro lado #1 | [Cinta de correr](/maquinas/treadmill) |
| eq-093 | Cinta de correr (caminadora) - otro lado #2 | [Cinta de correr](/maquinas/treadmill) |
| eq-094 | Cinta de correr (caminadora) - otro lado #3 | [Cinta de correr](/maquinas/treadmill) |
| eq-095 | Cinta de correr (caminadora) - otro lado #4 | [Cinta de correr](/maquinas/treadmill) |
| eq-096 | Caminadora tipo escalera/pasos (stepper) | [Caminadora tipo escalera (stepper)](/maquinas/stair-stepper) |
| eq-097 | Caminadora tipo escalera/pasos (stepper) | [Caminadora tipo escalera (stepper)](/maquinas/stair-stepper) |
| eq-098 | Caminadora tipo escalera/pasos (stepper) | [Caminadora tipo escalera (stepper)](/maquinas/stair-stepper) |
| eq-099 | Máquina de gradas (stair climber) | [Máquina de gradas (stair climber)](/maquinas/stair-climber) |
| eq-100 | Máquina de gradas (stair climber) | [Máquina de gradas (stair climber)](/maquinas/stair-climber) |
| eq-101 | Remo cerrado (Hammer Strength) | [Remo cerrado (Hammer Strength)](/maquinas/remo-hammer-strength) |
| eq-102 | Dominada asistida | [Dominada asistida](/maquinas/dominada-asistida) |
| eq-103 | Dominada asistida (segunda unidad) | [Dominada asistida](/maquinas/dominada-asistida) |
| eq-104 | Jalón (polea) | [Jalon al pecho](/maquinas/lat-pulldown) |
| eq-105 | Remo Hammer | [Remo Hammer](/maquinas/remo-hammer) |
| eq-106 | Remo T | [Remo T](/maquinas/remo-t) |
| eq-107 | Prensa de hombros (asiento, peso atrás, empuje hacia arriba y al frente) | [Press de hombro](/maquinas/shoulder-press) |
| eq-108 | Bicicleta | [Bicicleta estática](/maquinas/bicicleta-estatica) |
| eq-109 | Caminadora | [Cinta de correr](/maquinas/treadmill) |
| eq-110 | Máquina multi-estación (asiento ajustable, soporte de espalda, plataforma frontal, agarraderas múltiples) | [Máquina multi-estación](/maquinas/multiestacion-recepcion) |
| eq-111 | Máquina de gradas (stepper) - unidad 1 | [Caminadora tipo escalera (stepper)](/maquinas/stair-stepper) |
| eq-112 | Máquina de gradas (stepper) - unidad 2 | [Caminadora tipo escalera (stepper)](/maquinas/stair-stepper) |
| eq-113 | Press plano | [Press de pecho](/maquinas/chest-press) |
| eq-114 | Aperturas posteriores / Pec Deck Rear Delt (Fly Rear Delt) | [Aperturas posteriores (Pec Deck Rear Delt)](/maquinas/rear-delt-fly) |
| eq-115 | Overhead press (press militar) | [Overhead press (press militar)](/maquinas/overhead-press-machine) |
| eq-116 | Rotación de tronco | [Rotación de tronco](/maquinas/torso-rotation) |
| eq-117 | Abdominal | [Abdominal](/maquinas/ab-machine) |
| eq-118 | Back extension | [Back extension](/maquinas/back-extension) |
| eq-119 | Press inclinado | [Press de pecho inclinado](/maquinas/incline-chest-press) |
| eq-120 | Aperturas de pecho (Titanium) - brazos hacia el frente | [Pec deck / mariposa](/maquinas/pec-deck) |
| eq-121 | Chest Incline Press (más nueva, similar a la Titanium) | [Press de pecho inclinado](/maquinas/incline-chest-press) |
| eq-122 | Banca inclinada con postes en ángulo hacia arriba, pesos a los lados | [Banca inclinada con postes (por definir)](/maquinas/banca-inclinada-pendiente) |
| eq-123 | Predicador (Pressure Curve), asistido | [Predicador (curl de bíceps)](/maquinas/preacher-curl) |
| eq-124 | Predicador (marca amarilla) | [Predicador (curl de bíceps)](/maquinas/preacher-curl) |
| eq-125 | Extensión de codo | [Extensión de codo (tríceps)](/maquinas/elbow-extension) |
| eq-126 | Fondos (dips) | [Fondos (dips) asistidos](/maquinas/dip-machine) |
| eq-127 | Polea crossover, 4 estaciones (banquita, apoyo de rodillas, poleas abajo, polea arriba) | [Polea crossover (4 estaciones)](/maquinas/polea-crossover) |
| eq-128 | Polea (cable) | [Polea ajustable](/maquinas/cable-station) |
| eq-129 | Polea roja - unidad 1 | [Polea ajustable](/maquinas/cable-station) |
| eq-130 | Polea roja - unidad 2 | [Polea ajustable](/maquinas/cable-station) |
| eq-131 | Polea azul | [Polea ajustable](/maquinas/cable-station) |

Máquinas físicas: 76. Fichas: 47. Fichas vinculadas: 45.

Fichas sin activo asociado:
- leg-press: Prensa de pierna
- seated-row: Remo sentado
