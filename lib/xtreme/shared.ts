/**
 * API pública histórica de Xtreme.
 *
 * La implementación está separada por responsabilidad en `shared/`. Este
 * barrel conserva los imports existentes (`@/lib/xtreme/shared`) mientras los
 * consumidores nuevos pueden importar directamente del módulo específico.
 */
export * from "./shared/config";
export * from "./shared/dates";
export * from "./shared/identity";
export * from "./shared/member-rules";
export * from "./shared/occupancy";
export * from "./shared/presenters";
export * from "./shared/sanitizers";
export * from "./shared/types";
