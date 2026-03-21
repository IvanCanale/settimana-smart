"use client";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { getRecipeCategory, normalize } from "@/lib/planEngine";
import type { PreferenceLearning, Recipe } from "@/types";

const LEARNING_FALLBACK: PreferenceLearning = {
  keptRecipeIds: {},
  regeneratedRecipeIds: {},
  likedCategories: {},
  dislikedCategories: {},
  likedIngredients: {},
  dislikedIngredients: {},
};

export function useLearning() {
  const [learning, setLearning] = useLocalStorage<PreferenceLearning>("ss_learning_v1", LEARNING_FALLBACK);

  // Registra che l'utente ha tenuto una ricetta
  const learnFromRecipe = (recipeItem: Recipe | null, action: "keep" | "regenerate") => {
    if (!recipeItem) return;
    const category = getRecipeCategory(recipeItem);
    setLearning((prev) => {
      const next: PreferenceLearning = {
        keptRecipeIds: { ...prev.keptRecipeIds },
        regeneratedRecipeIds: { ...prev.regeneratedRecipeIds },
        likedCategories: { ...prev.likedCategories },
        dislikedCategories: { ...prev.dislikedCategories },
        likedIngredients: { ...prev.likedIngredients },
        dislikedIngredients: { ...prev.dislikedIngredients },
      };
      if (action === "keep") {
        next.keptRecipeIds[recipeItem.id] = (next.keptRecipeIds[recipeItem.id] || 0) + 1;
        next.likedCategories[category] = (next.likedCategories[category] || 0) + 1;
        recipeItem.ingredients.forEach((ingr) => {
          const k = normalize(ingr.name);
          next.likedIngredients[k] = (next.likedIngredients[k] || 0) + 1;
        });
      } else {
        next.regeneratedRecipeIds[recipeItem.id] = (next.regeneratedRecipeIds[recipeItem.id] || 0) + 1;
        next.dislikedCategories[category] = (next.dislikedCategories[category] || 0) + 1;
        recipeItem.ingredients.forEach((ingr) => {
          const k = normalize(ingr.name);
          next.dislikedIngredients[k] = (next.dislikedIngredients[k] || 0) + 1;
        });
      }
      return next;
    });
  };

  return { learning, setLearning, learnFromRecipe };
}
