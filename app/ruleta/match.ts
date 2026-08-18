import type { Dish, FoodCategory, IngredientTag, Restaurant } from "./foodData";
import { FOOD_CATEGORIES } from "./foodData";

export type DishMatch = {
  category: FoodCategory;
  restaurant: Restaurant;
  dish: Dish;
  score: number;
  matchedTags: readonly IngredientTag[];
};

// Cada plato se puntúa por cuántos ingredientes elegidos comparte. Se
// ordenan primero los que más coinciden; con empate manda quién tiene menos
// ingredientes "de más" (match más ajustado al antojo).
export function matchDishes(selectedTags: readonly IngredientTag[]): DishMatch[] {
  if (selectedTags.length === 0) return [];

  const selectedSet = new Set(selectedTags);
  const results: DishMatch[] = [];

  for (const category of FOOD_CATEGORIES) {
    for (const restaurant of category.restaurants) {
      for (const dish of restaurant.dishes) {
        const matchedTags = dish.tags.filter((tag) => selectedSet.has(tag));
        if (matchedTags.length === 0) continue;

        results.push({ category, restaurant, dish, score: matchedTags.length, matchedTags });
      }
    }
  }

  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.dish.tags.length - b.dish.tags.length;
  });
}
