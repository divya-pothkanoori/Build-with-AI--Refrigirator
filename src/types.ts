export enum FoodCategory {
  VEGETABLES = "Vegetables",
  FRUITS = "Fruits",
  DAIRY = "Dairy",
  MEAT_SEAFOOD = "Meat & Seafood",
  BAKERY = "Bakery & Grains",
  LEFTOVERS = "Leftovers",
  BEVERAGES = "Beverages",
  OTHER = "Other"
}

export enum StorageLocation {
  FRIDGE = "Fridge",
  FREEZER = "Freezer",
  PANTRY = "Pantry"
}

export enum ExpirationStatus {
  FRESH = "Fresh",
  EXPIRING_SOON = "Expiring Soon",
  EXPIRED = "Expired"
}

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  quantity: number;
  unit: string; // e.g., "pcs", "g", "ml", "packs", "bottles"
  location: StorageLocation;
  purchaseDate: string; // YYYY-MM-DD
  expirationDate: string; // YYYY-MM-DD
  notes?: string;
}

export interface ReceiptScanResult {
  name: string;
  category: FoodCategory;
  quantity: number;
  unit: string;
  shelfLifeDays: number;
}

export interface Recipe {
  id: string;
  title: string;
  cookingTime: number; // in minutes
  difficulty: "Easy" | "Medium" | "Hard";
  usedIngredients: string[]; // ingredients from current inventory
  missingIngredients: string[]; // ingredients not in inventory
  instructions: string[];
  description: string;
}
