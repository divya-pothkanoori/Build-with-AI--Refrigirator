import React, { useState } from "react";
import { ChefHat, Clock, AlertCircle, CheckCircle2, ShoppingBag, Sparkles, Loader2, ChevronDown, ChevronUp, Check } from "lucide-react";
import { FoodItem, Recipe } from "../types";

interface RecipeTabProps {
  items: FoodItem[];
  hasGeminiKey: boolean;
}

export default function RecipeTab({ items, hasGeminiKey }: RecipeTabProps) {
  // Select ingredients to use
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>(
    items.map((i) => i.name)
  );
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null);
  const [apiIsMocked, setApiIsMocked] = useState(false);

  // Sync selected list if items change
  React.useEffect(() => {
    setSelectedIngredients(items.map((i) => i.name));
  }, [items]);

  const toggleIngredientSelection = (name: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const selectAll = () => {
    setSelectedIngredients(items.map((i) => i.name));
  };

  const deselectAll = () => {
    setSelectedIngredients([]);
  };

  const triggerRecipeGeneration = async () => {
    if (selectedIngredients.length === 0) {
      alert("Please select at least one ingredient to build recipes!");
      return;
    }

    setIsGenerating(true);
    setRecipes([]);
    setActiveRecipeId(null);

    try {
      const response = await fetch("/api/generate-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: selectedIngredients }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate recipes");
      }

      const data = await response.json();
      
      // Map recipes to include a stable ID for interaction
      const parsedRecipes = (data.recipes || []).map((r: any, idx: number) => ({
        ...r,
        id: `recipe-${idx}`,
      }));

      setRecipes(parsedRecipes);
      setApiIsMocked(!!data.isMock);
      
      if (parsedRecipes.length > 0) {
        setActiveRecipeId(parsedRecipes[0].id); // Auto-expand first recipe
      }
    } catch (err: any) {
      console.error(err);
      alert("Error generating recipes: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="recipe-tab-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Ingredient Selector Rail */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-emerald-400" />
              <span>Ingredient Selector</span>
            </h3>

            {items.length > 0 && (
              <div className="flex gap-2 text-[10px] font-mono">
                <button onClick={selectAll} className="text-emerald-400 hover:underline">Select All</button>
                <span className="text-slate-600">|</span>
                <button onClick={deselectAll} className="text-slate-400 hover:underline">Clear</button>
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-10 bg-slate-950 border border-dashed border-slate-800 rounded-lg p-4">
              <AlertCircle className="h-6 w-6 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 leading-relaxed">No food ingredients currently stored in refrigerator.</p>
              <p className="text-[10px] text-slate-600 mt-1">Add items manually or upload a grocery receipt first!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 bg-slate-950 p-2 border border-slate-800 rounded-lg">
              {items.map((item) => {
                const isSelected = selectedIngredients.includes(item.name);
                return (
                  <label
                    key={item.id}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer border transition-all text-xs ${
                      isSelected
                        ? "bg-emerald-950/20 border-emerald-900/60 text-white"
                        : "bg-slate-900 border-transparent text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleIngredientSelection(item.name)}
                        className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer accent-emerald-500"
                      />
                      <span className="font-medium truncate">{item.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">
                      {item.quantity} {item.unit}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {/* Prompt Trigger Button */}
          {items.length > 0 && (
            <button
              onClick={triggerRecipeGeneration}
              disabled={isGenerating || selectedIngredients.length === 0}
              className={`w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold shadow-md transition-all ${
                selectedIngredients.length === 0
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white cursor-pointer"
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Whisking recipe options...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate AI Recipes</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Informative API Warning */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-3">
          <AlertCircle className={`h-5 w-5 shrink-0 ${hasGeminiKey ? "text-emerald-400" : "text-amber-400"}`} />
          <div className="text-xs">
            <h4 className="font-semibold text-slate-200">
              {hasGeminiKey ? "Gemini Chef Mode Active" : "Gemini Simulator Active"}
            </h4>
            <p className="text-slate-400 mt-1 leading-relaxed">
              {hasGeminiKey
                ? "The culinary recipe model is powered by Gemini 3.5 Flash, generating actual gourmet ideas and cooking step guidelines tailored to your selections."
                : "Missing GEMINI_API_KEY. Running in Simulator Mode. Recipes will be fetched from an intelligent mock chef system. Register your API key to go live!"}
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Recipes Desk */}
      <div className="lg:col-span-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm h-full flex flex-col">
          <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-emerald-400" />
            <span>Culinary Creations Desk</span>
          </h3>

          {/* Scanning / Loading state */}
          {isGenerating && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16 bg-slate-950 border border-slate-850 rounded-lg">
              <Loader2 className="h-10 w-10 text-emerald-400 animate-spin mb-4" />
              <p className="text-sm font-medium text-white">Analyzing selected ingredients...</p>
              <p className="text-xs text-slate-500 mt-1">Consulting flavor parameters & cooking heat guidelines</p>
            </div>
          )}

          {/* Initial empty state */}
          {!isGenerating && recipes.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16 bg-slate-950 border border-slate-850 rounded-lg p-6">
              <ChefHat className="h-10 w-10 text-slate-600 mb-3" />
              <p className="text-sm text-slate-400">Select available items and hit "Generate AI Recipes".</p>
              <p className="text-xs text-slate-600 mt-1 max-w-sm">The Chef engine parses what you checked and suggests nutritious meals highlighting those exact ingredients.</p>
            </div>
          )}

          {/* Recipe List */}
          {!isGenerating && recipes.length > 0 && (
            <div className="space-y-4 flex-1">
              {apiIsMocked && (
                <div className="bg-amber-950/20 border border-amber-900/30 text-amber-400 rounded-lg p-3 text-xs flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Chef Simulator: These gourmet ideas are calculated on mock ingredients. Provide an API key to query Gemini dynamically.</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {recipes.map((recipe) => {
                  const isActive = activeRecipeId === recipe.id;
                  return (
                    <div
                      key={recipe.id}
                      className={`border rounded-xl overflow-hidden transition-all duration-300 ${
                        isActive
                          ? "bg-slate-950 border-emerald-900/50 shadow-lg"
                          : "bg-slate-950 border-slate-800 hover:border-slate-750"
                      }`}
                    >
                      {/* Recipe Header (Clickable for expand/collapse) */}
                      <div
                        onClick={() => setActiveRecipeId(isActive ? null : recipe.id)}
                        className="p-4 flex justify-between items-start gap-4 cursor-pointer hover:bg-slate-900/20"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-sans font-semibold text-white text-base">{recipe.title}</h4>
                            <span className="text-[10px] font-mono uppercase bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded">
                              {recipe.difficulty}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{recipe.description}</p>
                          
                          <div className="flex items-center gap-4 pt-1">
                            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                              <Clock className="h-3.5 w-3.5 text-slate-500" />
                              <span>{recipe.cookingTime} Mins</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              <span>{recipe.usedIngredients.length} ingredients matching</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                          {isActive ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>

                      {/* Recipe Body Expansion */}
                      {isActive && (
                        <div className="p-4 pt-0 border-t border-slate-900/80 space-y-4 animate-fade-in">
                          {/* Ingredients Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                            {/* In-Fridge Ingredients */}
                            <div className="space-y-2">
                              <h5 className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Check className="h-3 w-3 text-emerald-400" />
                                <span>Used from fridge ({recipe.usedIngredients.length})</span>
                              </h5>
                              <ul className="space-y-1.5">
                                {recipe.usedIngredients.map((ing, i) => (
                                  <li key={i} className="text-xs text-slate-300 flex items-center gap-1.5 bg-slate-900 border border-slate-850 px-2.5 py-1 rounded-md">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                    <span>{ing}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Missing Ingredients */}
                            <div className="space-y-2">
                              <h5 className="text-[10px] font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                <ShoppingBag className="h-3 w-3 text-amber-400" />
                                <span>Missing Staples ({recipe.missingIngredients.length})</span>
                              </h5>
                              {recipe.missingIngredients.length === 0 ? (
                                <p className="text-xs text-slate-500 italic px-2.5">None! You have everything!</p>
                              ) : (
                                <ul className="space-y-1.5">
                                  {recipe.missingIngredients.map((ing, i) => (
                                    <li key={i} className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-900/50 border border-slate-850/60 px-2.5 py-1 rounded-md">
                                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                      <span>{ing}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>

                          {/* Instructions List */}
                          <div className="space-y-2 pt-2 border-t border-slate-900">
                            <h5 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Cooking Instructions</h5>
                            <ol className="space-y-2">
                              {recipe.instructions.map((step, i) => (
                                <li key={i} className="text-xs text-slate-300 flex gap-2 items-start">
                                  <span className="bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[10px] h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                    {i + 1}
                                  </span>
                                  <span className="leading-relaxed">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
