export const QR_GROUPS = [
  { id: "group-mancuernas-1", name: "Mancuernas 1", code: "MA-01", area: "Pesas", description: "Ficha grupal de mancuernas. La etiqueta identifica el conjunto, no cada mancuerna." },
  { id: "group-mancuernas-2", name: "Mancuernas 2", code: "MA-02", area: "Pesas", description: "Ficha grupal de mancuernas. La etiqueta identifica el conjunto, no cada mancuerna." },
  { id: "group-discos-1", name: "Discos 1", code: "DG-01", area: "Pesas - Discos", description: "Ficha grupal de discos. La etiqueta identifica el conjunto, no cada disco." },
  { id: "group-discos-2", name: "Discos 2", code: "DG-02", area: "Pesas - Discos", description: "Ficha grupal de discos. La etiqueta identifica el conjunto, no cada disco." },
  { id: "group-curls-barra", name: "Curl con barra", code: "CB-01", area: "Pesas", description: "Ficha grupal de barras para curl." },
  { id: "group-accesorios", name: "Accesorios", code: "AC-01", area: "Accesorios", description: "Ficha grupal de accesorios." },
  { id: "group-equipo-extra", name: "Equipo extra", code: "EX-01", area: "Equipo extra", description: "Ficha grupal de equipo extra." },
];

export function qrGroupPath(id: string) {
  return `/maquinas/grupo/${encodeURIComponent(id)}`;
}
