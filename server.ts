import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase request limit for base64 images (scanning receipts/fridge snapshots)
app.use(express.json({ limit: "15mb" }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const isGeminiAvailable = !!apiKey && apiKey !== "MY_GEMINI_API_KEY";

let ai: GoogleGenAI | null = null;
if (isGeminiAvailable) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  console.log("🚀 Gemini API client successfully initialized.");
} else {
  console.warn("⚠️ GEMINI_API_KEY is missing or using placeholder. Running in Simulator Mode.");
}

// ----------------- API ENDPOINTS -----------------

// 1. Health check & configuration info
app.get("/api/config", (req, res) => {
  res.json({
    hasGeminiKey: isGeminiAvailable,
    environment: process.env.NODE_ENV || "development",
  });
});

// 2. Scan Receipt / Food snapshot
app.post("/api/scan-receipt", async (req, res) => {
  const { image, mimeType } = req.body;

  if (!image) {
    return res.status(400).json({ error: "Missing image data" });
  }

  // Simulator Fallback Mode
  if (!isGeminiAvailable || !ai) {
    console.log("Simulating receipt parsing (Gemini API offline)");
    // Provide a smart list of grocery items based on common shopping lists
    const mockGroceryItems = [
      { name: "Fresh Spinach", category: "Vegetables", quantity: 1, unit: "bag", shelfLifeDays: 5 },
      { name: "Greek Yogurt", category: "Dairy", quantity: 4, unit: "cups", shelfLifeDays: 14 },
      { name: "Salmon Fillets", category: "Meat & Seafood", quantity: 2, unit: "pcs", shelfLifeDays: 3 },
      { name: "Whole Milk", category: "Dairy", quantity: 1, unit: "gallon", shelfLifeDays: 8 },
      { name: "Avocados", category: "Fruits", quantity: 3, unit: "pcs", shelfLifeDays: 4 },
      { name: "Sourdough Bread", category: "Bakery & Grains", quantity: 1, unit: "loaf", shelfLifeDays: 6 }
    ];
    // Add artificial delay to feel realistic
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return res.json({ items: mockGroceryItems, isMock: true });
  }

  try {
    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: image.replace(/^data:image\/\w+;base64,/, ""), // strip prefix if present
      },
    };

    const promptText = `Analyze this receipt or image of food ingredients and list the food items detected. 
    Estimate their storage categories (must be one of: Vegetables, Fruits, Dairy, Meat & Seafood, Bakery & Grains, Leftovers, Beverages, Other), 
    standard numeric quantities, short unit descriptions (like pcs, g, ml, bags, bottles, cans, packs), and recommend typical refrigerator/freezer/pantry shelf life in days under standard storage guidelines.
    Return the result in structured JSON format according to the schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, { text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Name of the food item, e.g. Broccoli, Milk" },
              category: { type: Type.STRING, description: "Category of the food item, must be exactly one of: Vegetables, Fruits, Dairy, Meat & Seafood, Bakery & Grains, Leftovers, Beverages, Other" },
              quantity: { type: Type.NUMBER, description: "Numeric quantity, defaults to 1 if unknown" },
              unit: { type: Type.STRING, description: "Unit of measurement, e.g. pcs, g, ml, pack, head, carton" },
              shelfLifeDays: { type: Type.INTEGER, description: "Typical standard shelf life days in storage" }
            },
            required: ["name", "category", "quantity", "unit", "shelfLifeDays"]
          }
        }
      }
    });

    const parsedItems = JSON.parse(response.text || "[]");
    return res.json({ items: parsedItems, isMock: false });

  } catch (error: any) {
    console.error("Gemini scanning error:", error);
    return res.status(500).json({ error: error.message || "Failed to analyze receipt image" });
  }
});

// 3. Smart Recipe Suggestion
app.post("/api/generate-recipes", async (req, res) => {
  const { ingredients } = req.body;

  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: "Missing or invalid ingredients array" });
  }

  // Simulator Fallback Mode
  if (!isGeminiAvailable || !ai) {
    console.log("Simulating recipe generation (Gemini API offline)");
    // Generate a list of realistic recipes using the supplied ingredients
    const inputNames = ingredients.map(i => i.toLowerCase());
    const mockRecipes = [
      {
        title: "Chef's Garden Stir Fry",
        cookingTime: 20,
        difficulty: "Easy",
        description: "A quick, sizzling stir fry featuring your freshly tracked ingredients and a light sesame glaze.",
        usedIngredients: ingredients.slice(0, 3),
        missingIngredients: ["Sesame Oil", "Soy Sauce", "Garlic"],
        instructions: [
          "Chop your available vegetables and proteins into bite-sized chunks.",
          "Heat sesame oil in a wok or large pan over high heat.",
          "Sauté the ingredients for 5-7 minutes until vibrant and crisp-tender.",
          "Pour soy sauce and minced garlic over, toss well, and serve hot."
        ]
      },
      {
        title: "Gourmet Refrigerator Frittata",
        cookingTime: 25,
        difficulty: "Easy",
        description: "The ultimate solution for expiring items. Whisk some eggs and bake your leftovers into an elegant breakfast slice.",
        usedIngredients: ingredients.slice(1, 4),
        missingIngredients: ["6 Fresh Eggs", "Cheddar Cheese", "Salt & Pepper"],
        instructions: [
          "Preheat your oven to 375°F (190°C).",
          "Sauté your selected ingredients in an oven-safe skillet with olive oil until warm.",
          "Whisk eggs with a splash of milk, salt, and pepper in a medium bowl.",
          "Pour egg mixture over the ingredients, top with cheddar cheese, and bake for 15 minutes."
        ]
      },
      {
        title: "Rustic Pantry Stew",
        cookingTime: 40,
        difficulty: "Medium",
        description: "A rich, slow-simmered stew that blends your refrigerator essentials into a warm, comforting bowl.",
        usedIngredients: ingredients.slice(0, 4),
        missingIngredients: ["Vegetable Broth", "Canned Tomatoes", "Italian Herbs"],
        instructions: [
          "Dice onions, garlic, and your available vegetables.",
          "In a deep pot, sauté onions and garlic in olive oil until soft.",
          "Add the rest of your ingredients, vegetable broth, and canned tomatoes.",
          "Simmer on medium-low heat for 30 minutes, stirring occasionally. Season to taste."
        ]
      }
    ];

    await new Promise((resolve) => setTimeout(resolve, 1500));
    return res.json({ recipes: mockRecipes, isMock: true });
  }

  try {
    const ingredientsListStr = ingredients.join(", ");
    const promptText = `Suggest 3 realistic, delicious recipes that make creative use of these refrigerator ingredients: ${ingredientsListStr}.
    Be smart: try to use as many of the provided ingredients as possible to prevent waste.
    For each recipe, classify which of the user's ingredients are used, specify other ingredients they would need as 'missingIngredients', and provide clear instructions.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Name of the recipe, e.g. Creamy Salmon Pasta" },
              cookingTime: { type: Type.INTEGER, description: "Cooking and prep time in minutes" },
              difficulty: { type: Type.STRING, description: "Difficulty level, must be Easy, Medium, or Hard" },
              description: { type: Type.STRING, description: "Appetizing description of the dish" },
              usedIngredients: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Sub-array containing only the specific user ingredients used in this recipe" 
              },
              missingIngredients: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Sub-array of any additional pantry staples or fresh items required but not in the user's list" 
              },
              instructions: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Step-by-step cooking steps" 
              }
            },
            required: ["title", "cookingTime", "difficulty", "description", "usedIngredients", "missingIngredients", "instructions"]
          }
        }
      }
    });

    const parsedRecipes = JSON.parse(response.text || "[]");
    return res.json({ recipes: parsedRecipes, isMock: false });

  } catch (error: any) {
    console.error("Gemini recipe error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate recipes" });
  }
});


// ----------------- VITE DEVELOPMENT & STATIC ASSETS ROUTING -----------------

async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("🛠️ Vite Dev Middleware loaded successfully.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("📦 Production mode: Serving static files from dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`📡 Smart Refrigerator Tracker running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
