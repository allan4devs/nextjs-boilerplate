export const PRODUCT_CATEGORIES = [
  "aguas",
  "hidratantes",
  "energizantes",
  "bebidas",
  "proteinas",
  "creatinas",
  "preentrenos",
  "batidos",
  "snacks",
  "dulces",
  "accesorios",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_CATEGORY_LABEL: Record<ProductCategory, string> = {
  aguas: "Aguas",
  hidratantes: "Hidratantes",
  energizantes: "Energizantes",
  bebidas: "Otras bebidas",
  proteinas: "Proteínas",
  creatinas: "Creatinas",
  preentrenos: "Pre-entrenos",
  batidos: "Batidos preparados",
  snacks: "Snacks y barras",
  dulces: "Dulces",
  accesorios: "Accesorios",
};

export function productSearchKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CR")
    .replace(/\s+/g, " ")
    .trim();
}

const CANONICAL_NAMES: Record<string, string> = {
  agua: "Agua",
  aguas: "Agua",
  "agua 600ml": "Agua 600 ml",
  "agua 600 ml": "Agua 600 ml",
  "agua 1l": "Agua 1 litro",
  "agua 1 l": "Agua 1 litro",
  "agua 1 litro": "Agua 1 litro",
  "amino energy lata": "Amino Energy lata",
  "barra tosh": "Barra Tosh",
  "barrita nature": "Barrita Nature",
  barritas: "Barritas",
  batido: "Batidos",
  batidos: "Batidos",
  battidos: "Batidos",
  "batido 2000": "Batido 2000",
  c4: "C4 pre-entreno",
  "c4 en polvo": "C4 pre-entreno",
  "c4 en lata": "C4 Energy",
  chicles: "Chicles",
  galleta: "Galletas",
  galletas: "Galletas",
  "galleta avena": "Galletas de avena",
  "galletas avena": "Galletas de avena",
  miel: "Miel",
  monster: "Monster Energy",
  panos: "Paños",
  pinas: "Piñas",
  powerade: "Powerade",
  redcon: "Redcon1 Energy",
  usn: "USN Energy",
};

export function normalizeProductDisplayName(value: string) {
  const compact = value.normalize("NFC").replace(/\s+/g, " ").trim();
  if (!compact) return "";
  return CANONICAL_NAMES[productSearchKey(compact)] ?? compact;
}

export function inferProductCategory(
  name: string,
  currentCategory?: unknown,
): ProductCategory | undefined {
  const normalized = productSearchKey(name);

  if (/\bagua\b/.test(normalized)) return "aguas";
  if (/monster|redcon|\busn\b|c4 en lata|c4 energy|amino energy lata/.test(normalized)) return "energizantes";
  if (/powerade|electrolit|electrolyte|hydration|re-lyte|\bbcaa\b/.test(normalized)) return "hidratantes";
  if (/ruthless|pre[- ]?workout|pre[- ]?entreno|c4 sport|c4 en polvo|^c4$|freakmaker/.test(normalized)) return "preentrenos";
  if (/creatina|creatine/.test(normalized)) return "creatinas";
  if (/\bbat+idos?\b/.test(normalized)) return "batidos";
  if (/barra|barrita|galleta/.test(normalized)) return "snacks";
  if (/chicle|pina|miel/.test(normalized)) return "dulces";
  if (/pano|toalla/.test(normalized)) return "accesorios";
  if (/protein|proteina/.test(normalized)) return "proteinas";
  if (/bebida|gaseosa|refresco|coca[- ]?cola/.test(normalized)) return "bebidas";

  if (PRODUCT_CATEGORIES.includes(currentCategory as ProductCategory)) {
    return currentCategory as ProductCategory;
  }
  return undefined;
}

export function canonicalProductIdentity(name: string, currentCategory?: unknown) {
  const canonicalName = normalizeProductDisplayName(name);
  return {
    name: canonicalName,
    category: inferProductCategory(canonicalName, currentCategory),
  };
}
