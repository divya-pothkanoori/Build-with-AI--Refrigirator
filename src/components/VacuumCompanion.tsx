import React, { useState, useEffect, useRef } from "react";
import { Wind, Play, Square, Battery, Wifi, Check, Trash2, ShieldAlert, AlertTriangle, RefreshCw, Layers } from "lucide-react";
import { FoodItem } from "../types";

interface VacuumCompanionProps {
  items: FoodItem[];
  onRemoveItem: (id: string) => void;
  lastSpillItem: { name: string; timestamp: number } | null;
}

export type VacuumStatus = "Docked & Charging" | "Navigating to Kitchen" | "Spot Cleaning Refrigerator Zone" | "Returning to Dock" | "Completed Task";

export default function VacuumCompanion({ items, onRemoveItem, lastSpillItem }: VacuumCompanionProps) {
  const [vacuumStatus, setVacuumStatus] = useState<VacuumStatus>("Docked & Charging");
  const [battery, setBattery] = useState(100);
  const [autoDispatch, setAutoDispatch] = useState(true);
  const [selectedSpillItem, setSelectedSpillItem] = useState<string>("");
  const [spillLog, setSpillLog] = useState<string[]>([]);
  const [currentCleanProgress, setCurrentCleanProgress] = useState(0);

  const cleaningTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Read stored vacuum preferences
  useEffect(() => {
    const savedAuto = localStorage.getItem("fridge_vacuum_auto_dispatch");
    if (savedAuto) setAutoDispatch(JSON.parse(savedAuto));
    
    const savedLog = localStorage.getItem("fridge_vacuum_logs");
    if (savedLog) setSpillLog(JSON.parse(savedLog));
  }, []);

  // Trigger on external spill events
  useEffect(() => {
    if (lastSpillItem && autoDispatch) {
      handleDispatchVacuum(lastSpillItem.name);
    }
  }, [lastSpillItem]);

  // Save logs
  const saveLog = (message: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formatted = `[${time}] ${message}`;
    setSpillLog((prev) => {
      const updated = [formatted, ...prev].slice(0, 30);
      localStorage.setItem("fridge_vacuum_logs", JSON.stringify(updated));
      return updated;
    });
  };

  // Dispatch Vacuum Workflow
  const handleDispatchVacuum = (itemName: string = "Manual Spill") => {
    if (cleaningTimerRef.current) {
      clearInterval(cleaningTimerRef.current);
    }

    setVacuumStatus("Navigating to Kitchen");
    setBattery(98);
    setCurrentCleanProgress(15);
    saveLog(`Spill detected: ${itemName}. Dispatched RoboVac to Refrigerator Zone.`);

    // Simulation Stages
    let progress = 15;
    cleaningTimerRef.current = setInterval(() => {
      progress += 10;
      if (progress >= 100) {
        clearInterval(cleaningTimerRef.current!);
        setVacuumStatus("Completed Task");
        setBattery((prev) => Math.max(0, prev - 12));
        saveLog("RoboVac finished kitchen spot cleaning and successfully docked.");
        
        // Return to Dock after a short delay
        setTimeout(() => {
          setVacuumStatus("Docked & Charging");
          setBattery(100);
        }, 3000);
      } else if (progress >= 75) {
        setVacuumStatus("Returning to Dock");
        setCurrentCleanProgress(progress);
      } else if (progress >= 35) {
        setVacuumStatus("Spot Cleaning Refrigerator Zone");
        setCurrentCleanProgress(progress);
        setBattery((prev) => Math.max(0, prev - 1));
      } else {
        setCurrentCleanProgress(progress);
      }
    }, 1500);
  };

  const handleStopVacuum = () => {
    if (cleaningTimerRef.current) {
      clearInterval(cleaningTimerRef.current);
    }
    setVacuumStatus("Docked & Charging");
    setCurrentCleanProgress(0);
    saveLog("Manual override: RoboVac recalled to dock.");
  };

  // Monitor Refrigerator Spill Event (e.g., when an item is selected from dropdown)
  const handleReportManualSpill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpillItem) return;

    const item = items.find((i) => i.id === selectedSpillItem);
    if (!item) return;

    // Trigger cleaning dispatch
    handleDispatchVacuum(item.name);

    // Remove or empty item from fridge as it got spilled
    onRemoveItem(item.id);
    setSelectedSpillItem("");
  };

  // Expose auto-dispatch state changes
  const toggleAutoDispatch = () => {
    const newVal = !autoDispatch;
    setAutoDispatch(newVal);
    localStorage.setItem("fridge_vacuum_auto_dispatch", JSON.stringify(newVal));
    saveLog(`Smart trigger mode updated: Auto-Dispatch is now ${newVal ? "ENABLED" : "DISABLED"}.`);
  };

  return (
    <div id="vacuum-companion-widget" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-stretch">
        
        {/* Left Console: Controls & Status */}
        <div className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400">
                <Wind className={`h-5 w-5 ${vacuumStatus !== "Docked & Charging" ? "animate-spin" : ""}`} />
              </div>
              <div>
                <h4 className="font-sans font-semibold text-white text-sm">RoboVac Kitchen Integration</h4>
                <p className="text-[10px] text-slate-400 font-mono">Status: {vacuumStatus}</p>
              </div>
            </div>

            {/* Battery Indicator */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded text-xs border border-slate-850">
              <Battery className={`h-3.5 w-3.5 ${battery > 20 ? "text-emerald-400" : "text-rose-400 animate-pulse"}`} />
              <span className="font-mono text-slate-300">{battery}%</span>
            </div>
          </div>

          {/* Progress / Status Bar */}
          {vacuumStatus !== "Docked & Charging" && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>Task Progress</span>
                <span>{currentCleanProgress}%</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="bg-blue-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_#60a5fa]"
                  style={{ width: `${currentCleanProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Quick manual dispatcher controls */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => handleDispatchVacuum("Manual Command")}
              disabled={vacuumStatus !== "Docked & Charging"}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                vacuumStatus !== "Docked & Charging"
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 text-white active:scale-95 cursor-pointer"
              }`}
            >
              <Play className="h-3.5 w-3.5" />
              <span>Spot Clean Area</span>
            </button>

            <button
              onClick={handleStopVacuum}
              disabled={vacuumStatus === "Docked & Charging"}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                vacuumStatus === "Docked & Charging"
                  ? "bg-slate-950 text-slate-700 border border-slate-900 cursor-not-allowed"
                  : "bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 active:scale-95 cursor-pointer"
              }`}
            >
              <Square className="h-3.5 w-3.5 text-rose-500" />
              <span>Recall Vacuum</span>
            </button>
          </div>

          {/* Auto Dispatch Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div className="text-xs">
              <p className="font-medium text-slate-200">Auto-Dispatch on Spills</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">Sends cleaner automatically when food items are marked as spilled.</p>
            </div>
            <button
              onClick={toggleAutoDispatch}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoDispatch ? "bg-emerald-500" : "bg-slate-800"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoDispatch ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Middle Console: Report Spill Form */}
        <div className="flex-1 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <h5 className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span>Log Liquid or Food Spill</span>
            </h5>
            <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
              If an item is knocked over or leaks in/near the refrigerator, log it here. We will remove it from inventory and automatically send the vacuum cleaner.
            </p>

            <form onSubmit={handleReportManualSpill} className="space-y-3">
              <div>
                <select
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                  value={selectedSpillItem}
                  onChange={(e) => setSelectedSpillItem(e.target.value)}
                >
                  <option value="">-- Choose what spilled --</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.quantity} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              {selectedSpillItem && (
                <button
                  type="submit"
                  className="w-full py-1.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Report Spill & Clean</span>
                </button>
              )}
            </form>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-3">
            <Wifi className="h-3 w-3 text-emerald-400" />
            <span>Connection Secure: Kitchen_Gateway_IoT</span>
          </div>
        </div>

        {/* Right Console: Clean System Logs */}
        <div className="w-full md:w-64 flex flex-col justify-between">
          <div className="space-y-2">
            <h5 className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-blue-400" />
              <span>Smart Home Logs</span>
            </h5>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-850 h-28 overflow-y-auto font-mono text-[9px] text-slate-400 space-y-1.5">
              {spillLog.length === 0 ? (
                <p className="text-slate-600 italic">No vacuum dispatch events logged.</p>
              ) : (
                spillLog.map((log, i) => (
                  <p key={i} className="break-words border-b border-slate-900/50 pb-1 last:border-0 leading-relaxed">
                    {log}
                  </p>
                ))
              )}
            </div>
          </div>

          {spillLog.length > 0 && (
            <button
              onClick={() => {
                setSpillLog([]);
                localStorage.removeItem("fridge_vacuum_logs");
              }}
              className="text-[9px] font-mono text-slate-600 hover:text-slate-400 text-left underline mt-2"
            >
              Clear Logs
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
