export type ProteinTag = "pollo" | "carne" | "cerdo" | "pescado" | "veggie" | "queso";
export type BaseTag = "arroz" | "pan" | "masa" | "papas" | "pure" | "tortilla" | "ensalada";
export type StyleTag =
  | "picante"
  | "bbq"
  | "clasico"
  | "casero"
  | "callejero"
  | "cremoso"
  | "plancha"
  | "ajillo"
  | "crispy";
export type ExtraTag =
  | "queso-extra"
  | "frijoles"
  | "aguacate"
  | "salsa-especial"
  | "vegetales"
  | "brocoli"
  | "coliflor"
  | "papa"
  | "para-compartir";

export type IngredientTag = ProteinTag | BaseTag | StyleTag | ExtraTag;

export type IngredientOption = {
  id: IngredientTag;
  label: string;
  emoji: string;
};

export type IngredientGroup = {
  id: "protein" | "base" | "style" | "extra";
  title: string;
  subtitle: string;
  options: readonly IngredientOption[];
};

export const PROTEIN_OPTIONS = [
  { id: "pollo", label: "Pollo", emoji: "🍗" },
  { id: "carne", label: "Carne de res", emoji: "🥩" },
  { id: "cerdo", label: "Cerdo", emoji: "🥓" },
  { id: "pescado", label: "Pescado", emoji: "🐟" },
  { id: "veggie", label: "Sin carne", emoji: "🥦" },
  { id: "queso", label: "Con mucho queso", emoji: "🧀" },
] as const satisfies readonly IngredientOption[];

export const BASE_OPTIONS = [
  { id: "arroz", label: "Arroz", emoji: "🍚" },
  { id: "pan", label: "Pan", emoji: "🍞" },
  { id: "masa", label: "Masa / pizza", emoji: "🍕" },
  { id: "pure", label: "Puré de papa", emoji: "🥔" },
  { id: "tortilla", label: "Tortilla", emoji: "🌮" },
  { id: "ensalada", label: "Ensalada", emoji: "🥗" },
] as const satisfies readonly IngredientOption[];

export const STYLE_OPTIONS = [
  { id: "plancha", label: "A la plancha", emoji: "♨️" },
  { id: "ajillo", label: "Al ajillo", emoji: "🧄" },
  { id: "crispy", label: "Crispy / empanizado", emoji: "✨" },
  { id: "picante", label: "Picante", emoji: "🌶️" },
  { id: "bbq", label: "BBQ / ahumado", emoji: "🔥" },
  { id: "casero", label: "Casero", emoji: "🏠" },
] as const satisfies readonly IngredientOption[];

export const EXTRA_OPTIONS = [
  { id: "queso-extra", label: "Queso extra", emoji: "🧀" },
  { id: "frijoles", label: "Frijoles", emoji: "🫘" },
  { id: "aguacate", label: "Aguacate", emoji: "🥑" },
  { id: "salsa-especial", label: "Salsa especial", emoji: "🥫" },
  { id: "vegetales", label: "Vegetales", emoji: "🥬" },
  { id: "brocoli", label: "Brócoli", emoji: "🥦" },
  { id: "coliflor", label: "Coliflor", emoji: "🤍" },
  { id: "papa", label: "Papa", emoji: "🥔" },
  { id: "para-compartir", label: "Para compartir", emoji: "🍽️" },
] as const satisfies readonly IngredientOption[];

export const INGREDIENT_GROUPS: readonly IngredientGroup[] = [
  {
    id: "protein",
    title: "¿Con qué proteína?",
    subtitle: "Elegí al menos una",
    options: PROTEIN_OPTIONS,
  },
  {
    id: "base",
    title: "¿Sobre qué base?",
    subtitle: "El acompañante principal",
    options: BASE_OPTIONS,
  },
  {
    id: "style",
    title: "¿Con qué estilo?",
    subtitle: "El sabor que buscás hoy",
    options: STYLE_OPTIONS,
  },
  {
    id: "extra",
    title: "¿Algo extra?",
    subtitle: "Opcional, para completar el antojo",
    options: EXTRA_OPTIONS,
  },
];

export type Dish = {
  name: string;
  tags: readonly IngredientTag[];
};

export type Restaurant = {
  name: string;
  location: string;
  dishes: readonly Dish[];
};

export type FoodCategory = {
  id: string;
  label: string;
  wheelLabel: string;
  emoji: string;
  color: string;
  restaurants: readonly Restaurant[];
};

// Catálogo local de San Carlos. Está separado de la interfaz para que sea
// sencillo sumar restaurantes y corregir platos conforme llegue información.
// Cada plato lleva `tags` para poder emparejarlo contra los ingredientes que
// arma el usuario en el Plate Builder.
export const FOOD_CATEGORIES = [
  {
    id: "pizza",
    label: "Pizza",
    wheelLabel: "Pizza",
    emoji: "🍕",
    color: "#ff6b6b",
    restaurants: [
      {
        name: "Pizza Ranch",
        location: "San Carlos",
        dishes: [
          { name: "Pizza Meat Lover Ranch", tags: ["carne", "cerdo", "masa", "clasico", "queso-extra"] },
          { name: "Pizza Chicken Ranch", tags: ["pollo", "masa", "cremoso", "queso-extra"] },
          { name: "Breadsticks Ranch", tags: ["masa", "para-compartir", "queso-extra"] },
        ],
      },
      {
        name: "Pizza Ready",
        location: "Ciudad Quesada",
        dishes: [
          { name: "Pizza de pepperoni", tags: ["cerdo", "masa", "clasico", "queso-extra"] },
          { name: "Pizza hawaiana", tags: ["cerdo", "masa", "clasico"] },
          { name: "Pizza suprema", tags: ["carne", "pollo", "masa", "vegetales", "para-compartir"] },
        ],
      },
    ],
  },
  {
    id: "casera",
    label: "Casera y para picar",
    wheelLabel: "Casera",
    emoji: "🍛",
    color: "#ffd166",
    restaurants: [
      {
        name: "Comidas Umaña",
        location: "Barrio San Antonio, Ciudad Quesada",
        dishes: [
          { name: "Casado del día", tags: ["pollo", "carne", "arroz", "casero", "frijoles"] },
          { name: "Arroz con pollo", tags: ["pollo", "arroz", "casero"] },
          { name: "Hamburguesa con papas", tags: ["carne", "pan", "papas", "clasico"] },
        ],
      },
      {
        name: "Soda Mary",
        location: "San Carlos",
        dishes: [
          { name: "Casado del día", tags: ["pollo", "carne", "arroz", "casero", "frijoles"] },
          { name: "Hamburguesa con papas", tags: ["carne", "pan", "papas", "clasico"] },
          { name: "Taco arreglado", tags: ["carne", "pollo", "tortilla", "callejero", "salsa-especial"] },
        ],
      },
      {
        name: "Bar San Gerardo",
        location: "San Gerardo, Ciudad Quesada",
        dishes: [
          { name: "Chifrijo", tags: ["cerdo", "arroz", "frijoles", "casero", "para-compartir"] },
          { name: "Bocas mixtas", tags: ["carne", "cerdo", "pollo", "para-compartir", "casero"] },
          { name: "Casado del día", tags: ["pollo", "carne", "arroz", "casero", "frijoles"] },
        ],
      },
    ],
  },
  {
    id: "rapida",
    label: "Antojos y comida rápida",
    wheelLabel: "Antojos",
    emoji: "🍔",
    color: "#60d394",
    restaurants: [
      {
        name: "KFC",
        location: "Ciudad Quesada",
        dishes: [
          { name: "Big Box Kentucky", tags: ["pollo", "papas", "clasico", "salsa-especial"] },
          { name: "Zinger", tags: ["pollo", "pan", "picante"] },
          { name: "Popcorn chicken", tags: ["pollo", "callejero", "para-compartir"] },
        ],
      },
      {
        name: "TodoAMil",
        location: "San Carlos",
        dishes: [
          { name: "Hamburguesa", tags: ["carne", "pan", "clasico", "queso-extra"] },
          { name: "Salchipapas", tags: ["cerdo", "papas", "callejero", "salsa-especial"] },
          { name: "Tacos", tags: ["carne", "tortilla", "callejero", "picante"] },
        ],
      },
      {
        name: "FabitosFood",
        location: "San Carlos",
        dishes: [
          { name: "Hamburguesa especial", tags: ["carne", "pan", "queso-extra", "salsa-especial"] },
          { name: "Salchipapas", tags: ["cerdo", "papas", "callejero", "salsa-especial"] },
          { name: "Nachos con carne", tags: ["carne", "queso", "queso-extra", "para-compartir", "picante"] },
        ],
      },
    ],
  },
] as const satisfies readonly FoodCategory[];

export const CATALOG_TOTALS = {
  categories: FOOD_CATEGORIES.length,
  restaurants: FOOD_CATEGORIES.reduce((total, category) => total + category.restaurants.length, 0),
  dishes: FOOD_CATEGORIES.reduce(
    (total, category) =>
      total + category.restaurants.reduce((restaurantTotal, restaurant) => restaurantTotal + restaurant.dishes.length, 0),
    0,
  ),
};
