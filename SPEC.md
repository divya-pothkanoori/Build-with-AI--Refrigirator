# Smart Refrigerator Tracker — Specification Document

This specification defines the product features, user interface architecture, data schemas, and technical implementation plan for the **Smart Refrigerator Tracker**, an AI-powered assistant designed to manage refrigerator inventory, reduce food waste, track expiration dates, and suggest personalized recipes.

---

## 1. Product Overview

The **Smart Refrigerator Tracker** helps households manage their food inventory efficiently. By tracking what's inside the refrigerator, warning users about items nearing their expiration dates, and offering creative recipe suggestions using those items, the application minimizes food waste and simplifies meal planning.

### Core Value Propositions
- **Stop Food Waste**: Real-time monitoring of food expiration with clear color-coded statuses (Fresh, Expiring Soon, Expired).
- **Frictionless Logging**: Quick addition of multiple items using either manual entry or AI-powered receipt/photo scanning.
- **Smart Cooking**: Dynamic recipe recommendations tailored to what is *currently* available in the fridge, prioritizing items that need to be used immediately.

---

## 2. Key Product Features

### A. Inventory Management & Expiration Tracking
- **Interactive Dashboard**: Quick metrics on total items, expiring soon (within 3 days), and expired items.
- **Unified Inventory List**:
  - Filter by category (e.g., Vegetables, Fruits, Dairy, Meat/Seafood, Leftovers, Beverages).
  - Search by item name.
  - Filter by status (Fresh, Warning, Expired).
  - Location categorization (Fridge, Freezer, Pantry).
- **Manual Add/Edit Form**: Quick inputs for Name, Category, Quantity/Unit, Storage Location, Purchase Date, and Expiration Date.

### B. AI-Powered Receipt & Photo Scanning
- **Visual Input**: Uploading receipt images or a snapshot of ingredients.
- **Gemini Extraction**: Express server proxies images to the Gemini API (`gemini-3.5-flash`) to parse:
  - List of detected items.
  - Estimated quantities.
  - Recommended shelf life / expiration date suggestions based on typical storage guidelines.
- **Verification Stage**: Before writing items to the inventory, parsed results are presented in an editable list so the user can verify or adjust names and dates.

### C. Smart Recipe Generator (Chef's Corner)
- **Zero-Waste Recipe Matching**: Uses Gemini AI to suggest recipes based on the ingredients *currently* in the fridge.
- **Urgent Ingredient Prioritization**: Gives higher weight to ingredients flagged as "Expiring Soon" or "Expired" to consume them before they go to waste.
- **Missing Ingredients List**: Identifies what additional items are needed, enabling easy shopping list generation.
- **Cooking Instructions**: Full recipe card with cooking time, difficulty, matching ingredients, and step-by-step instructions.

---

## 3. Data Schemas & Type System

To maintain strict type safety, the application defines the following TypeScript types and interfaces in `/src/types.ts`:

```typescript
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
  unit: string; // e.g., "pcs", "g", "ml", "packs"
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
```

---

## 4. User Interface & Core Flows

The application is structured into a clean, single-screen responsive layout with high-contrast slate aesthetics:

1. **Top Status Bar**: Live summary cards showing total item counts, warning alerts, and immediate actions.
2. **Tabbed Navigation Workspace**:
   - **Tab 1: Fridge Shelf (Inventory)**: Grid/list of food cards with visual countdown circles showing days left. Custom action buttons to edit, consume, or dispose of items.
   - **Tab 2: Smart AI Scanner**: Upload receipts or grocery photos. Displays a live parsing loader with reassuring status messages, followed by a verification form.
   - **Tab 3: Chef's Corner (Recipe Engine)**: Generates gourmet recipes dynamically tailored to inventory. Displays match-accuracy scores and highlights ingredients saved from waste.

---

## 5. Technical Architecture

### Tech Stack
- **Frontend**: React (v19) + Vite (v6), Tailwind CSS (v4) for styling, Lucide React for crisp visual icons, and Framer Motion for beautiful component mount transitions and modal animations.
- **Backend**: Express Server (Express v4) implementing a `/api/*` endpoint structure.
- **AI Integration**: Server-side `@google/genai` using `'gemini-3.5-flash'` to guarantee API key security.
- **Persistence**: Starts with `localStorage` client-side, with full architectural support to upgrade to Firebase Firestore.

### API Specifications

#### `POST /api/scan-receipt`
Receives an image payload and extracts purchase lists.
- **Payload**: `{ image: "base64_encoded_string", mimeType: "image/jpeg" }`
- **Gemini Role**: Parses receipt text/images, converts to `ReceiptScanResult[]`.

#### `POST /api/generate-recipes`
Generates custom recipes from available items.
- **Payload**: `{ ingredients: string[] }`
- **Gemini Role**: Suggests 3 recipes, separating matching and missing ingredients.

---

## 6. Implementation Plan

1. **Step 1: Set Up Backend Server & Gemini Clients** (Configure `server.ts` to boot on Port 3000, bundle via esbuild).
2. **Step 2: Core State & Mock Data Setup** (Build the inventory management schemas, mock data, and local storage integration).
3. **Step 3: Build the Dashboard & Inventory List UI** (Design a modern, high-contrast, responsive dashboard with category filters and warning alerts).
4. **Step 4: Build the AI Scan & Verification Center** (Add file-upload handlers, capture camera feeds, and implement backend parsing).
5. **Step 5: Implement the Chef's Corner Recipe Generator** (Connect backend recipe endpoint with front-end cards).
