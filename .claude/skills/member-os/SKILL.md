---
name: member-os
description: Trabajar en el Member OS (app de socios en /app). Usar cuando se agregue o modifique un tab, modal, estado, acción o componente del app de socios (ExtremeGymSite, useMemberOs, app/components/member/).
---

# Member OS — cómo modificarlo

El Member OS vive en `app/components/member/` y se monta desde `app/ExtremeGymSite.tsx` (solo composición, no meter lógica ahí).

## Mapa de archivos

| Necesitás… | Archivo |
|---|---|
| Estado, efectos, llamadas al API | `useMemberOs.ts` (hook central, retorna `MemberOs`) |
| Datos estáticos (clases, máquinas, tabs) | `constants.ts` |
| Tipos de dominio / respuestas del API | `types.ts` |
| Helpers puros (fechas, cédula, formato) | `utils.ts` |
| UI de un tab | `tabs/ResumenTab.tsx`, `EntrenarTab`, `MaquinasTab`, `ProgresoTab`, `PerfilTab` |
| Modales del OS | `OsModals.tsx` |
| Shell (header/nav/dock/login/PIN) | `TopHud`, `SideNav`, `BottomDock`, `CedulaLoginGate`, `PinModal` |

## Patrones obligatorios

1. **Todo el estado va en `useMemberOs`** y se expone en el objeto de retorno. Los componentes reciben `{ os: MemberOs }` y destructuran arriba del JSX. No crear `useState` de datos del socio dentro de un tab.
2. **Llamadas al API**: usar `readJson<T>(response)` de `utils.ts` (lanza `Error` con el mensaje del server). Patrón de acción:
   ```ts
   setError(""); setMessage("");
   try { const data = await readJson<MembersResponse>(res); setMember(data.member); setMessage("…"); }
   catch (err) { setError(err instanceof Error ? err.message : "…"); }
   ```
3. **UI**: usar los componentes de `app/components/GameOS.tsx` (`GamePanel`, `GameButton`, `GameModal`, `GameStat`, `GameCallout`, `GameChip`, `GameLabel`). Estética: bordes `border-[3px]`, sombras duras `shadow-[4px_4px_0_…]`, lima `#d8ff3e`, fondo `#0c0c0c`.
4. **Textos** en español de Costa Rica, con voseo ("marcá", "tocá") y tono motivador.
5. **Acciones que requieren sesión** deben chequear `if (!unlocked) return;`.

## Recetas

- **Nuevo tab**: agregar entrada en `TABS` y `TAB_SUBTITLES` (`constants.ts`), crear `tabs/NuevoTab.tsx` con `{ os }: { os: MemberOs }`, y agregar `{tab === "nuevo" && <NuevoTab os={os} />}` en `ExtremeGymSite.tsx`.
- **Nuevo modal del OS**: agregar la variante al tipo `OsModal` (`types.ts`), abrirlo con `setOsModal({ kind: "…" })` y renderizar el `GameModal` en `OsModals.tsx`.
- **Nueva acción contra el API**: función en `useMemberOs` + agregarla al objeto de retorno; el tipo `MemberOs` se infiere solo.
- **Nuevo paso del tour**: agregar a `TOUR_STEPS` (`constants.ts`); el `target` debe coincidir con un atributo `data-tour` existente.

## Verificar

`npx tsc --noEmit`. **No levantar el dev server**: si el cambio necesita prueba en navegador, pedirle al usuario que corra `npm run dev` y probar en `/app` (login con cédula, el flujo completo depende de Mongo configurado).
