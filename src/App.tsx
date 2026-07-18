import React, { useState, useEffect } from "react";
import { Refrigerator, Sparkles, ChefHat, Layers, Calendar, AlertCircle } from "lucide-react";
import { FoodItem, FoodCategory, StorageLocation, ExpirationStatus } from "./types";
import DashboardStats from "./components/DashboardStats";
import InventoryTab from "./components/InventoryTab";
import ScannerTab from "./components/ScannerTab";
import RecipeTab from "./components/RecipeTab";
import AlarmCenter from "./components/AlarmCenter";
import VacuumCompanion from "./components/VacuumCompanion";

// Smart initial food items to populate the fridge so the user can interact right away
const INITIAL_INVENTORY: FoodItem[] = [
  {
    id: "item-1",
    name: "Organic Strawberries",
    category: FoodCategory.FRUITS,
    quantity: 1,
    unit: "carton",
    location: StorageLocation.FRIDGE,
    purchaseDate: "2026-07-15",
    expirationDate: "2026-07-19", // Expiring soon in 2 days from July 17
    notes: "Sweet & fresh",
  },
  {
    id: "item-2",
    name: "Whole Milk 1 Gallon",
    category: FoodCategory.DAIRY,
    quantity: 1,
    unit: "bottle",
    location: StorageLocation.FRIDGE,
    purchaseDate: "2026-07-10",
    expirationDate: "2026-07-25", // Fresh
    notes: "Family size",
  },
  {
    id: "item-3",
    name: "Fresh Atlantic Salmon",
    category: FoodCategory.MEAT_SEAFOOD,
    quantity: 2,
    unit: "fillets",
    location: StorageLocation.FRIDGE,
    purchaseDate: "2026-07-16",
    expirationDate: "2026-07-19", // Expiring soon in 2 days
    notes: "Keep ice cold",
  },
  {
    id: "item-4",
    name: "Baby Spinach Bag",
    category: FoodCategory.VEGETABLES,
    quantity: 1,
    unit: "bag",
    location: StorageLocation.FRIDGE,
    purchaseDate: "2026-07-12",
    expirationDate: "2026-07-16", // Expired on July 16
    notes: "For morning omelettes",
  },
  {
    id: "item-5",
    name: "Frozen Broccoli Florets",
    category: FoodCategory.VEGETABLES,
    quantity: 2,
    unit: "bags",
    location: StorageLocation.FREEZER,
    purchaseDate: "2026-07-01",
    expirationDate: "2026-09-30", // Long shelf life
    notes: "Steamable bags",
  },
  {
    id: "item-6",
    name: "Sourdough Bread Loaf",
    category: FoodCategory.BAKERY,
    quantity: 1,
    unit: "loaf",
    location: StorageLocation.PANTRY,
    purchaseDate: "2026-07-14",
    expirationDate: "2026-07-22", // Fresh
  },
];

export default function App() {
  // Main State
  const [inventory, setInventory] = useState<FoodItem[]>(() => {
    const saved = localStorage.getItem("fridge_inventory");
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
  });

  const [activeTab, setActiveTab] = useState<"inventory" | "scanner" | "recipes">("inventory");
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [lastSpillItem, setLastSpillItem] = useState<{ name: string; timestamp: number } | null>(null);

  const handleReportSpill = (itemName: string) => {
    setLastSpillItem({ name: itemName, timestamp: Date.now() });
  };

  // Persistence write-back
  useEffect(() => {
    localStorage.setItem("fridge_inventory", JSON.stringify(inventory));
  }, [inventory]);

  // Read server configuration on boot
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/config");
        if (response.ok) {
          const data = await response.json();
          setHasGeminiKey(!!data.hasGeminiKey);
        }
      } catch (err) {
        console.error("Failed to fetch backend configuration details", err);
      }
    };
    fetchConfig();
  }, []);

  // Expiration calculation utility
  const getExpirationStatus = (item: FoodItem): ExpirationStatus => {
    const expDate = new Date(item.expirationDate);
    const today = new Date();
    expDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return ExpirationStatus.EXPIRED;
    } else if (diffDays <= 3) {
      return ExpirationStatus.EXPIRING_SOON;
    } else {
      return ExpirationStatus.FRESH;
    }
  };

  // State mutators
  const handleAddItem = (newItem: Omit<FoodItem, "id">) => {
    const itemWithId: FoodItem = {
      ...newItem,
      id: `item-${Date.now()}`,
    };
    setInventory((prev) => [itemWithId, ...prev]);
  };

  const handleRemoveItem = (id: string) => {
    setInventory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateQuantity = (id: string, newQty: number) => {
    setInventory((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: newQty } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const handleEditItem = (updatedItem: FoodItem) => {
    setInventory((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  const handleImportItems = (importedItems: Omit<FoodItem, "id">[]) => {
    const formatted = importedItems.map((item, idx) => ({
      ...item,
      id: `imported-${Date.now()}-${idx}`,
    }));
    setInventory((prev) => [...formatted, ...prev]);
    setActiveTab("inventory"); // Auto-route to inventory to inspect imports
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Decorative ambient background accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-20 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Header / Navigation rail */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-emerald-400">
              <Refrigerator className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-sans font-semibold tracking-tight text-white">Smart Fridge</h1>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-900/40">AI Ready</span>
              </div>
              <p className="text-xs text-slate-400">Intelligent food companion & ingredient tracking</p>
            </div>
          </div>

          {/* Action & Navigation Area */}
          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end">
            {/* Alarm & Notification Bell */}
            <AlarmCenter
              items={inventory}
              getExpirationStatus={getExpirationStatus}
              onRemoveItem={handleRemoveItem}
              onUpdateQuantity={handleUpdateQuantity}
            />

            {/* Navigation Tab Bars */}
            <nav className="flex bg-slate-900/60 p-1 rounded-lg border border-slate-800/80">
              <button
                onClick={() => setActiveTab("inventory")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-all ${
                  activeTab === "inventory"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Fridge Drawer</span>
              </button>

              <button
                onClick={() => setActiveTab("scanner")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-all ${
                  activeTab === "scanner"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Photo Scanner</span>
              </button>

              <button
                onClick={() => setActiveTab("recipes")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-all ${
                  activeTab === "recipes"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ChefHat className="h-3.5 w-3.5" />
                <span>Chef's Corner</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {/* Core Statistic Summary Cards (Always Visible to reduce waste anxiety) */}
        <DashboardStats items={inventory} getExpirationStatus={getExpirationStatus} />

        {/* Smart Vacuum Cleaner IoT Connector */}
        <VacuumCompanion 
          items={inventory} 
          onRemoveItem={handleRemoveItem} 
          lastSpillItem={lastSpillItem} 
        />

        {/* Dynamic Tab Switcher */}
        <div id="tab-content" className="mt-2">
          {activeTab === "inventory" && (
            <InventoryTab
              items={inventory}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
              onUpdateQuantity={handleUpdateQuantity}
              onEditItem={handleEditItem}
              getExpirationStatus={getExpirationStatus}
              onReportSpill={handleReportSpill}
            />
          )}

          {activeTab === "scanner" && (
            <ScannerTab
              onImportItems={handleImportItems}
              hasGeminiKey={hasGeminiKey}
            />
          )}

          {activeTab === "recipes" && (
            <RecipeTab
              items={inventory}
              hasGeminiKey={hasGeminiKey}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 mt-12 bg-slate-950 text-center">
        <div className="max-w-6xl mx-auto px-4 text-xs text-slate-500 font-mono flex flex-col sm:flex-row justify-between items-center gap-3">
          <span>Smart Refrigerator Tracker &copy; 2026</span>
          <div className="flex gap-4">
            <span className="text-slate-600">Built with Gemini 3.5 Flash & Antigravity</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
