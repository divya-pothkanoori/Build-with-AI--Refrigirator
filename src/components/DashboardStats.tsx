import React from "react";
import { Sparkles, AlertTriangle, Flame, Layers } from "lucide-react";
import { FoodItem, ExpirationStatus } from "../types";

interface DashboardStatsProps {
  items: FoodItem[];
  getExpirationStatus: (item: FoodItem) => ExpirationStatus;
}

export default function DashboardStats({ items, getExpirationStatus }: DashboardStatsProps) {
  const stats = React.useMemo(() => {
    let total = items.length;
    let fresh = 0;
    let expiringSoon = 0;
    let expired = 0;

    items.forEach((item) => {
      const status = getExpirationStatus(item);
      if (status === ExpirationStatus.FRESH) fresh++;
      else if (status === ExpirationStatus.EXPIRING_SOON) expiringSoon++;
      else if (status === ExpirationStatus.EXPIRED) expired++;
    });

    return { total, fresh, expiringSoon, expired };
  }, [items, getExpirationStatus]);

  return (
    <div id="dashboard-stats" className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {/* Total Items Card */}
      <div id="stat-total-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm transition-all hover:border-slate-700">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Total Inventory</p>
            <h3 className="text-3xl font-sans font-semibold text-white mt-1">{stats.total}</h3>
          </div>
          <div className="bg-slate-800 p-2 rounded-lg text-slate-300">
            <Layers className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
          <span className="font-semibold text-emerald-400">{stats.fresh}</span> fresh, 
          <span className="font-semibold text-amber-400">{stats.expiringSoon}</span> alert
        </div>
      </div>

      {/* Fresh Food Card */}
      <div id="stat-fresh-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm transition-all hover:border-slate-700">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Fresh & Good</p>
            <h3 className="text-3xl font-sans font-semibold text-emerald-400 mt-1">{stats.fresh}</h3>
          </div>
          <div className="bg-emerald-950/40 p-2 rounded-lg text-emerald-400">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-slate-800 rounded-full h-1">
            <div 
              className="bg-emerald-400 h-1 rounded-full transition-all duration-500" 
              style={{ width: stats.total ? `${(stats.fresh / stats.total) * 100}%` : "0%" }}
            />
          </div>
        </div>
      </div>

      {/* Expiring Soon Card */}
      <div id="stat-warning-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm transition-all hover:border-slate-700">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Use Imminently</p>
            <h3 className={`text-3xl font-sans font-semibold mt-1 ${stats.expiringSoon > 0 ? "text-amber-400 animate-pulse" : "text-slate-300"}`}>
              {stats.expiringSoon}
            </h3>
          </div>
          <div className={`p-2 rounded-lg ${stats.expiringSoon > 0 ? "bg-amber-950/40 text-amber-400" : "bg-slate-800 text-slate-400"}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-slate-800 rounded-full h-1">
            <div 
              className="bg-amber-400 h-1 rounded-full transition-all duration-500" 
              style={{ width: stats.total ? `${(stats.expiringSoon / stats.total) * 100}%` : "0%" }}
            />
          </div>
        </div>
      </div>

      {/* Expired Items Card */}
      <div id="stat-expired-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm transition-all hover:border-slate-700">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Expired Items</p>
            <h3 className={`text-3xl font-sans font-semibold mt-1 ${stats.expired > 0 ? "text-rose-500" : "text-slate-300"}`}>
              {stats.expired}
            </h3>
          </div>
          <div className={`p-2 rounded-lg ${stats.expired > 0 ? "bg-rose-950/40 text-rose-400" : "bg-slate-800 text-slate-400"}`}>
            <Flame className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-slate-800 rounded-full h-1">
            <div 
              className="bg-rose-500 h-1 rounded-full transition-all duration-500" 
              style={{ width: stats.total ? `${(stats.expired / stats.total) * 100}%` : "0%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
