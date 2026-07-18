import React, { useState } from "react";
import { PlusCircle, Search, Filter, Trash2, CheckCircle2, ChevronRight, Calendar, Tag, MapPin, AlertCircle, ArrowUpDown, Edit2, Wind } from "lucide-react";
import { FoodItem, FoodCategory, StorageLocation, ExpirationStatus } from "../types";

interface InventoryTabProps {
  items: FoodItem[];
  onAddItem: (item: Omit<FoodItem, "id">) => void;
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, newQty: number) => void;
  onEditItem: (item: FoodItem) => void;
  getExpirationStatus: (item: FoodItem) => ExpirationStatus;
  onReportSpill?: (itemName: string) => void;
}

export default function InventoryTab({
  items,
  onAddItem,
  onRemoveItem,
  onUpdateQuantity,
  onEditItem,
  getExpirationStatus,
  onReportSpill,
}: InventoryTabProps) {
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedLocation, setSelectedLocation] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"expiration" | "added">("expiration");

  // Manual Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    category: FoodCategory.VEGETABLES,
    quantity: 1,
    unit: "pcs",
    location: StorageLocation.FRIDGE,
    purchaseDate: new Date().toISOString().split("T")[0],
    expirationDate: "",
    notes: "",
  });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editItemState, setEditItemState] = useState<FoodItem | null>(null);

  // Calculate days remaining
  const getDaysRemaining = (expDateStr: string) => {
    const expDate = new Date(expDateStr);
    const today = new Date();
    expDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Pre-fill expiration helper based on average shelf life
  const handleCategoryChangeForNewItem = (category: FoodCategory) => {
    let daysToAdd = 7; // Default
    switch (category) {
      case FoodCategory.VEGETABLES:
        daysToAdd = 5;
        break;
      case FoodCategory.FRUITS:
        daysToAdd = 7;
        break;
      case FoodCategory.DAIRY:
        daysToAdd = 10;
        break;
      case FoodCategory.MEAT_SEAFOOD:
        daysToAdd = 3;
        break;
      case FoodCategory.BAKERY:
        daysToAdd = 6;
        break;
      case FoodCategory.LEFTOVERS:
        daysToAdd = 3;
        break;
      case FoodCategory.BEVERAGES:
        daysToAdd = 14;
        break;
      default:
        daysToAdd = 10;
    }

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysToAdd);
    
    setNewItem((prev) => ({
      ...prev,
      category,
      expirationDate: futureDate.toISOString().split("T")[0],
    }));
  };

  // Open modal & set initial recommended date
  const openAddModal = () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5); // 5 days from now default
    setNewItem({
      name: "",
      category: FoodCategory.VEGETABLES,
      quantity: 1,
      unit: "pcs",
      location: StorageLocation.FRIDGE,
      purchaseDate: new Date().toISOString().split("T")[0],
      expirationDate: futureDate.toISOString().split("T")[0],
      notes: "",
    });
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim() || !newItem.expirationDate) return;

    onAddItem({
      name: newItem.name.trim(),
      category: newItem.category,
      quantity: Math.max(0.1, Number(newItem.quantity)),
      unit: newItem.unit || "pcs",
      location: newItem.location,
      purchaseDate: newItem.purchaseDate,
      expirationDate: newItem.expirationDate,
      notes: newItem.notes.trim() || undefined,
    });

    setIsAddModalOpen(false);
  };

  const handleCategoryChangeForEditItem = (category: FoodCategory) => {
    if (!editItemState) return;
    let daysToAdd = 7; // Default
    switch (category) {
      case FoodCategory.VEGETABLES:
        daysToAdd = 5;
        break;
      case FoodCategory.FRUITS:
        daysToAdd = 7;
        break;
      case FoodCategory.DAIRY:
        daysToAdd = 10;
        break;
      case FoodCategory.MEAT_SEAFOOD:
        daysToAdd = 3;
        break;
      case FoodCategory.BAKERY:
        daysToAdd = 6;
        break;
      case FoodCategory.LEFTOVERS:
        daysToAdd = 3;
        break;
      case FoodCategory.BEVERAGES:
        daysToAdd = 14;
        break;
      default:
        daysToAdd = 10;
    }

    const baseDate = editItemState.purchaseDate ? new Date(editItemState.purchaseDate) : new Date();
    baseDate.setDate(baseDate.getDate() + daysToAdd);
    
    setEditItemState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        category,
        expirationDate: baseDate.toISOString().split("T")[0],
      };
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItemState || !editItemState.name.trim() || !editItemState.expirationDate) return;

    onEditItem({
      ...editItemState,
      name: editItemState.name.trim(),
      quantity: Math.max(0.1, Number(editItemState.quantity)),
      unit: editItemState.unit || "pcs",
      notes: editItemState.notes?.trim() || undefined,
    });

    setIsEditModalOpen(false);
    setEditItemState(null);
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesLocation = selectedLocation === "All" || item.location === selectedLocation;
    const matchesStatus = selectedStatus === "All" || getExpirationStatus(item) === selectedStatus;

    return matchesSearch && matchesCategory && matchesLocation && matchesStatus;
  });

  // Sort items based on user choice
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === "expiration") {
      return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
    } else {
      // Sort by purchaseDate (newest first)
      const dateA = new Date(a.purchaseDate).getTime();
      const dateB = new Date(b.purchaseDate).getTime();
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      return b.id.localeCompare(a.id);
    }
  });

  return (
    <div id="inventory-tab-root" className="space-y-6">
      {/* Search & Action Bar */}
      <div id="filter-bar" className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ingredients, leftovers..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters Selects */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Category Filter */}
          <div className="relative">
            <select
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none pr-8"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {Object.values(FoodCategory).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>

          {/* Location Filter */}
          <div className="relative">
            <select
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none pr-8"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="All">All Storage</option>
              {Object.values(StorageLocation).map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            <MapPin className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none pr-8"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value={ExpirationStatus.FRESH}>🟢 Fresh</option>
              <option value={ExpirationStatus.EXPIRING_SOON}>🟡 Expiring Soon</option>
              <option value={ExpirationStatus.EXPIRED}>🔴 Expired</option>
            </select>
            <AlertCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>

          {/* Sorting Dropdown */}
          <div className="relative">
            <select
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none pr-8"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "expiration" | "added")}
            >
              <option value="expiration">📅 Expiration (Closest first)</option>
              <option value="added">📥 Date Added (Newest first)</option>
            </select>
            <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>

          {/* Add Manual Button */}
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-medium text-xs px-4 py-2 rounded-lg transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Grid of Food Items */}
      {sortedItems.length === 0 ? (
        <div id="no-items" className="text-center py-16 bg-slate-900 border border-dashed border-slate-800 rounded-2xl">
          <Tag className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-sans text-sm">No ingredients found matching your filter rules.</p>
          <button 
            onClick={openAddModal} 
            className="text-xs text-emerald-400 hover:text-emerald-300 mt-2 underline"
          >
            Manually log some items
          </button>
        </div>
      ) : (
        <div id="inventory-grid" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sortedItems.map((item) => {
            const status = getExpirationStatus(item);
            const daysLeft = getDaysRemaining(item.expirationDate);

            let statusColor = "text-emerald-400 bg-emerald-950/30 border-emerald-900/50";
            let daysLabel = `Expires in ${daysLeft} days`;
            
            if (status === ExpirationStatus.EXPIRING_SOON) {
              statusColor = "text-amber-400 bg-amber-950/30 border-amber-900/50";
              daysLabel = daysLeft === 0 ? "Expires today!" : daysLeft === 1 ? "Expires tomorrow!" : `Expires in ${daysLeft} days`;
            } else if (status === ExpirationStatus.EXPIRED) {
              statusColor = "text-rose-400 bg-rose-950/30 border-rose-900/50 animate-pulse";
              daysLabel = daysLeft < 0 ? `Expired ${Math.abs(daysLeft)} days ago` : "Expired";
            }

            return (
              <div
                key={item.id}
                id={`food-card-${item.id}`}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  {/* Category & Status Tags */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                      {item.category}
                    </span>
                    <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${statusColor}`}>
                      {status === ExpirationStatus.FRESH ? "🟢 Fresh" : status === ExpirationStatus.EXPIRING_SOON ? "🟡 Warning" : "🔴 Spoiled"}
                    </span>
                  </div>

                  {/* Title & Notes */}
                  <h4 className="font-sans font-medium text-white text-base truncate">{item.name}</h4>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3 text-slate-500" />
                      <span>{item.quantity} {item.unit}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-500" />
                      <span>{item.location}</span>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-slate-500 italic mt-2 line-clamp-1 border-l border-slate-800 pl-2">
                      "{item.notes}"
                    </p>
                  )}
                </div>

                {/* Footer Expiration Visualizer & Action buttons */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      <span className="font-mono text-[11px]">{item.expirationDate}</span>
                    </div>
                    <span className={`font-medium ${status === ExpirationStatus.EXPIRED ? "text-rose-400" : status === ExpirationStatus.EXPIRING_SOON ? "text-amber-400" : "text-emerald-400"}`}>
                      {daysLabel}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {/* Consume / Decrement */}
                    <button
                      onClick={() => {
                        if (item.quantity > 1) {
                          onUpdateQuantity(item.id, item.quantity - 1);
                        } else {
                          onRemoveItem(item.id);
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition-colors"
                      title="Use one unit"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Use 1</span>
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => {
                        setEditItemState(item);
                        setIsEditModalOpen(true);
                      }}
                      className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-slate-400 hover:text-emerald-400 rounded-lg border border-slate-700/50 transition-colors"
                      title="Edit item details"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    {/* Discard / Trash */}
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="py-1.5 px-2.5 bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-800 hover:border-rose-900/50 transition-colors"
                      title="Discard item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    {/* Spill & Clean Vacuum Trigger */}
                    <button
                      onClick={() => {
                        if (onReportSpill) {
                          onReportSpill(item.name);
                        }
                        onRemoveItem(item.id);
                      }}
                      className="py-1.5 px-2.5 bg-slate-950 hover:bg-blue-950/45 text-slate-400 hover:text-blue-400 rounded-lg border border-slate-800 hover:border-blue-900/50 transition-colors animate-pulse"
                      title="Spilled! Remove & Auto-clean"
                    >
                      <Wind className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Add Popup Dialog */}
      {isAddModalOpen && (
        <div id="add-modal" className="fixed inset-0 bg-black/80 flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <h3 className="text-lg font-sans font-semibold text-white mb-4">Add Food Ingredient</h3>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* Item Name */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Food Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Avocado, Whole Milk, Leftover Pasta"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </div>

              {/* Category & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Category</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    value={newItem.category}
                    onChange={(e) => handleCategoryChangeForNewItem(e.target.value as FoodCategory)}
                  >
                    {Object.values(FoodCategory).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Storage Location</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    value={newItem.location}
                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value as StorageLocation })}
                  >
                    {Object.values(StorageLocation).map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quantity & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Quantity</label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Unit</label>
                  <input
                    type="text"
                    placeholder="pcs, g, ml, bags, cans"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  />
                </div>
              </div>

              {/* Purchase Date & Expiration Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Purchase Date</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    value={newItem.purchaseDate}
                    onChange={(e) => setNewItem({ ...newItem, purchaseDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Expiration Date</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    value={newItem.expirationDate}
                    onChange={(e) => setNewItem({ ...newItem, expirationDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Notes (Optional)</label>
                <textarea
                  placeholder="e.g. Organic, brand name, leftover dinner context"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500 h-16 resize-none"
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-medium transition-colors border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Popup Dialog */}
      {isEditModalOpen && editItemState && (
        <div id="edit-modal" className="fixed inset-0 bg-black/80 flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <h3 className="text-lg font-sans font-semibold text-white mb-4">Edit Food Ingredient</h3>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Item Name */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Food Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Avocado, Whole Milk, Leftover Pasta"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  value={editItemState.name}
                  onChange={(e) => setEditItemState({ ...editItemState, name: e.target.value })}
                />
              </div>

              {/* Category & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Category</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    value={editItemState.category}
                    onChange={(e) => handleCategoryChangeForEditItem(e.target.value as FoodCategory)}
                  >
                    {Object.values(FoodCategory).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Storage Location</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    value={editItemState.location}
                    onChange={(e) => setEditItemState({ ...editItemState, location: e.target.value as StorageLocation })}
                  >
                    {Object.values(StorageLocation).map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quantity & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Quantity</label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    value={editItemState.quantity}
                    onChange={(e) => setEditItemState({ ...editItemState, quantity: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Unit</label>
                  <input
                    type="text"
                    placeholder="pcs, g, ml, bags, cans"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    value={editItemState.unit}
                    onChange={(e) => setEditItemState({ ...editItemState, unit: e.target.value })}
                  />
                </div>
              </div>

              {/* Purchase Date & Expiration Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Purchase Date</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    value={editItemState.purchaseDate}
                    onChange={(e) => setEditItemState({ ...editItemState, purchaseDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Expiration Date</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    value={editItemState.expirationDate}
                    onChange={(e) => setEditItemState({ ...editItemState, expirationDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">Notes (Optional)</label>
                <textarea
                  placeholder="e.g. Organic, brand name, leftover dinner context"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500 h-16 resize-none"
                  value={editItemState.notes || ""}
                  onChange={(e) => setEditItemState({ ...editItemState, notes: e.target.value })}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditItemState(null);
                  }}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-medium transition-colors border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
