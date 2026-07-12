# GROK.md

Guía completa del proyecto en [CLAUDE.md](CLAUDE.md) y [AGENTS.md](AGENTS.md) — seguirlas.

## Regla dura: servidores

- **NO crear, correr ni levantar servidores.** Nada de `npm run dev`, `npm start` ni comandos equivalentes, ni siquiera en background.
- Verificar cambios solo con `npx tsc --noEmit` + `npm run build` (no requieren servidor).
- El usuario levanta el dev server él mismo cuando quiere probar en el navegador.
- Si un servidor quedó corriendo y estorba: `taskkill /F /IM node.exe`, o por puerto: `Get-NetTCPConnection -LocalPort 3000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`.
