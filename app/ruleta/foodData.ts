export type RestaurantChoice = {
  name: string;
  location: string;
  dishes: readonly [string, string, string];
};

export type FoodCategory = {
  id: string;
  label: string;
  wheelLabel: string;
  emoji: string;
  color: string;
  restaurants: readonly RestaurantChoice[];
};

// Catálogo local de San Carlos. Está separado de la interfaz para que sea
// sencillo sumar restaurantes y corregir platos conforme llegue información.
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
        dishes: ["Pizza Meat Lover Ranch", "Pizza Chicken Ranch", "Breadsticks Ranch"],
      },
      {
        name: "Pizza Ready",
        location: "Ciudad Quesada",
        dishes: ["Pizza de pepperoni", "Pizza hawaiana", "Pizza suprema"],
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
        dishes: ["Casado del día", "Arroz con pollo", "Hamburguesa con papas"],
      },
      {
        name: "Soda Mary",
        location: "San Carlos",
        dishes: ["Casado del día", "Hamburguesa con papas", "Taco arreglado"],
      },
      {
        name: "Bar San Gerardo",
        location: "San Gerardo, Ciudad Quesada",
        dishes: ["Chifrijo", "Bocas mixtas", "Casado del día"],
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
        dishes: ["Big Box Kentucky", "Zinger", "Popcorn chicken"],
      },
      {
        name: "TodoAMil",
        location: "San Carlos",
        dishes: ["Hamburguesa", "Salchipapas", "Tacos"],
      },
      {
        name: "FabitosFood",
        location: "San Carlos",
        dishes: ["Hamburguesa especial", "Salchipapas", "Nachos con carne"],
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
