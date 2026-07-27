---
name: ui-design
description: Estándar obligatorio para diseñar o modificar interfaces visuales del sitio Xtreme Gym.
---

# UI Design — estándar Xtreme Gym

Usar este skill en cualquier tarea que cree, rediseñe o ajuste UI pública, Member OS, recepción o admin.

## Barra de calidad

- Diseñar con criterio editorial contemporáneo: jerarquía clara, ritmo, aire y una idea visual dominante.
- Evitar grillas genéricas de tarjetas iguales, texto flotando sin soporte y estilos que parezcan defaults de framework.
- Mantener el lenguaje Xtreme: negro, marfil y amarillo `#f6c400` en sitio público; lima `#d8ff3e` en Member OS. El color de marca es acento, no relleno indiscriminado.
- Tratar cada composición como un sistema: tipografía, espaciado, contraste, estados interactivos y responsive deben sentirse intencionales juntos.

## Tipografía y legibilidad

- Nunca colocar texto sobre fotografía sin una capa de contraste estable; usar gradiente, scrim o superficie con contraste suficiente.
- Los títulos deben usar escalas fluidas con `clamp()` cuando cruzan varios breakpoints y no depender de que una palabra tenga una longitud específica.
- Limitar líneas de lectura, usar `text-wrap: balance` en títulos y `text-wrap: pretty` en párrafos cuando ayude.
- No usar texto auxiliar menor a 10 px salvo índices decorativos no esenciales. Mantener interlineado generoso en cuerpo.
- Verificar visualmente palabras largas en español e inglés: no deben invadir tarjetas vecinas ni quedar cortadas.

## Composición

- Priorizar una jerarquía de tres niveles como máximo por bloque.
- Dar a fotografías un rol compositivo real: encuadre, foco, gradiente y tratamiento cromático consistentes.
- Usar bordes, sombras y microinteracciones con moderación. Un hover debe reforzar la estructura, no ser el único momento en que el contenido se vuelve legible.
- En grillas, comprobar móvil, tablet, laptop y escritorio amplio. El contenido importante debe funcionar sin hover.

## Accesibilidad y verificación

- Mantener foco visible, targets táctiles de al menos 44 px y contraste WCAG AA para texto funcional.
- Respetar `prefers-reduced-motion`.
- Antes de entregar: correr `npx tsc --noEmit` y `npm run build`. Nunca levantar un servidor.
- Revisar al menos: overflow, wrapping, contraste, estados hover/focus y consistencia entre español e inglés.

## Auditoría global obligatoria

Cuando se detecte un problema visual repetible, no corregir únicamente la instancia reportada:

1. Buscar el mismo patrón en todo `app/`, incluyendo sitio público, equivalentes en inglés y Member OS.
2. Clasificar los hallazgos por familia visual: héroes, tarjetas fotográficas, grillas, modales y estados vacíos.
3. Corregir todas las instancias que compartan la causa, sin uniformar componentes que ya tengan una solución adecuada.
4. Comprobar que el contenido se entiende con la imagen más clara y la más oscura del conjunto.
5. Mantener tres niveles legibles: contexto o eyebrow, título principal y detalle. La metadata nunca debe competir con el título.
