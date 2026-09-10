# Revisión del plano con Josué · 2026-09-10

Fuente: plano `main` guardado en MongoDB (revisión 359). El proceso conserva geometría y bloqueos y usa una transacción con respaldo en `xtreme_gym_floor_plan_migrations`, migración `josue-2026-09-10`.

- 52 activos actualizados: 49 códigos y 11 asociaciones de ficha corregidas.
- Cuatro elementos manuales convertidos en activos `eq-plan-<id original>`: Smith, bicicleta, vuelos laterales y extensión de rodilla. Conservan sus posiciones y no se inventaron códigos físicos.
- `eq-119` («xx») eliminado por instrucción del usuario, también de la copia inicial del inventario.
- PI-25A/B y PI-26A/B distinguen las unidades duplicadas, por instrucción del usuario.
- Nueve fichas de identificación nuevas. Foto, técnica, músculos y rutina siguen pendientes de verificación; no se publican instrucciones inventadas ni fotos de otro equipo.
- Quedan pendientes los códigos de las cuatro unidades nuevas y la identificación de `eq-019` (su PI-19 coincide con el código corregido del abductor).
- Los alias QR antiguos se conservan. Los enlaces por activo resuelven la asociación vigente.

Revisión sin escribir:

```powershell
node --env-file=.env --env-file=.env.local scripts/reconcile-josue-plan.mjs
```

El proceso se aplicó y la revisión posterior devolvió cero cambios y cero altas pendientes. Las fichas nuevas requieren desplegar el catálogo actualizado; la escritura en Mongo no despliega el código.
