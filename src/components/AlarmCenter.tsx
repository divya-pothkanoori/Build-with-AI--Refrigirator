import React, { useState, useEffect, useRef } from "react";
import { Bell, BellRing, BellOff, Volume2, VolumeX, ShieldAlert, Check, Play, RefreshCw, Sparkles, X, Clock, HelpCircle, AlertTriangle, Trash2 } from "lucide-react";
import { FoodItem, ExpirationStatus } from "../types";

interface AlarmCenterProps {
  items: FoodItem[];
  getExpirationStatus: (item: FoodItem) => ExpirationStatus;
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, newQty: number) => void;
}

export default function AlarmCenter({
  items,
  getExpirationStatus,
  onRemoveItem,
  onUpdateQuantity,
}: AlarmCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("fridge_alarm_sound_enabled");
    return saved ? JSON.parse(saved) : true;
  });
  
  const [snoozedItems, setSnoozedItems] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("fridge_alarm_snoozed_items");
    return saved ? JSON.parse(saved) : {};
  });

  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "unsupported";
  });

  const [hasSentSystemNotification, setHasSentSystemNotification] = useState<Record<string, boolean>>({});
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Persistence for settings
  useEffect(() => {
    localStorage.setItem("fridge_alarm_sound_enabled", JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem("fridge_alarm_snoozed_items", JSON.stringify(snoozedItems));
  }, [snoozedItems]);

  // Request system notification permission
  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      // Send a test notification if granted
      if (permission === "granted") {
        new Notification("Smart Fridge Alerts Active", {
          body: "You will now receive notifications when ingredients are about to expire!",
          icon: "/favicon.ico",
        });
      }
    }
  };

  // Synthesize alarm sound using Web Audio API (no assets needed, 100% reliable)
  const triggerBuzzerChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Refrigerator alarm chime: Double elegant electronic beeps
      // Beep 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.45);

      // Beep 2 (slightly delayed, higher pitch)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.2); // C6 note
      gain2.gain.setValueAtTime(0, ctx.currentTime + 0.2);
      gain2.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      osc2.start(ctx.currentTime + 0.2);
      osc2.stop(ctx.currentTime + 0.65);
    } catch (e) {
      console.warn("AudioContext block/error:", e);
    }
  };

  // Filter items that are critical (expired or expiring soon) and not snoozed
  const criticalItems = items.filter((item) => {
    const status = getExpirationStatus(item);
    return (status === ExpirationStatus.EXPIRED || status === ExpirationStatus.EXPIRING_SOON) && !snoozedItems[item.id];
  });

  const expiredCount = criticalItems.filter(item => getExpirationStatus(item) === ExpirationStatus.EXPIRED).length;
  const expiringSoonCount = criticalItems.filter(item => getExpirationStatus(item) === ExpirationStatus.EXPIRING_SOON).length;

  // Sound loop controller
  useEffect(() => {
    if (soundEnabled && criticalItems.length > 0) {
      // Trigger immediate chime on load/change
      triggerBuzzerChime();

      // Setup a periodic reminder (every 25 seconds) to mimic refrigerator open warning
      alarmIntervalRef.current = setInterval(() => {
        triggerBuzzerChime();
      }, 25000);
    } else {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
      }
    }

    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
      }
    };
  }, [soundEnabled, criticalItems.length]);

  // System Push Notifications controller
  useEffect(() => {
    if (notificationPermission === "granted") {
      criticalItems.forEach((item) => {
        const status = getExpirationStatus(item);
        const uniqueKey = `${item.id}-${status}`;
        
        // Only send notification once per state per session
        if (!hasSentSystemNotification[uniqueKey]) {
          const isExpired = status === ExpirationStatus.EXPIRED;
          new Notification(isExpired ? "🚨 Food Item Expired!" : "⏳ Food Expiring Soon!", {
            body: isExpired 
              ? `"${item.name}" has expired! Please remove or replace it to keep your fridge healthy.` 
              : `"${item.name}" expires soon! Consume it or plan a recipe to reduce waste.`,
            icon: "/favicon.ico",
            tag: item.id,
          });

          setHasSentSystemNotification(prev => ({
            ...prev,
            [uniqueKey]: true
          }));
        }
      });
    }
  }, [criticalItems, notificationPermission, hasSentSystemNotification]);

  // Snooze item
  const handleSnoozeItem = (id: string) => {
    setSnoozedItems(prev => ({
      ...prev,
      [id]: true
    }));
  };

  // Reset all snoozes
  const handleResetAlarms = () => {
    setSnoozedItems({});
    setHasSentSystemNotification({});
    triggerBuzzerChime();
  };

  return (
    <div className="relative inline-block" id="alarm-center-root">
      {/* Alarm bell button in navigation bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl border transition-all ${
          criticalItems.length > 0
            ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
        }`}
        title={`${criticalItems.length} active refrigerator alarms`}
      >
        {criticalItems.length > 0 ? (
          <BellRing className="h-5 w-5 animate-bounce" />
        ) : (
          <Bell className="h-5 w-5" />
        )}

        {criticalItems.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-mono font-bold text-[10px] h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-950 animate-pulse">
            {criticalItems.length}
          </span>
        )}
      </button>

      {/* Main Dropdown Panel */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-3 w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-4 animate-fade-in text-left">
            
            {/* Header section */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-400" />
                <h4 className="font-sans font-semibold text-white text-sm">Fridge Expiry Alarm</h4>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick settings area */}
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/60 mb-4 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">Buzzer Alert Sound</span>
                <button
                  onClick={() => {
                    setSoundEnabled(!soundEnabled);
                    if (!soundEnabled) {
                      setTimeout(triggerBuzzerChime, 100);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium text-[11px] transition-colors ${
                    soundEnabled
                      ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {soundEnabled ? (
                    <>
                      <Volume2 className="h-3 w-3" />
                      <span>On (Chirping)</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-3 w-3" />
                      <span>Muted</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">System Notifications</span>
                {notificationPermission === "granted" ? (
                  <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-mono border border-emerald-500/20">
                    🟢 Active
                  </span>
                ) : (
                  <button
                    onClick={requestNotificationPermission}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
                  >
                    🔔 Request
                  </button>
                )}
              </div>

              <div className="flex gap-2 mt-1">
                <button
                  onClick={triggerBuzzerChime}
                  className="flex-1 text-center py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 text-[10px] font-mono flex items-center justify-center gap-1"
                >
                  <Play className="h-2.5 w-2.5 text-blue-400" />
                  <span>Test Alarm Beep</span>
                </button>
                {Object.keys(snoozedItems).length > 0 && (
                  <button
                    onClick={handleResetAlarms}
                    className="flex-1 text-center py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 text-[10px] font-mono flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="h-2.5 w-2.5 text-emerald-400" />
                    <span>Reset Snoozed</span>
                  </button>
                )}
              </div>
            </div>

            {/* Expiring Foods List */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                Active Critical Alerts ({criticalItems.length})
              </span>

              {criticalItems.length === 0 ? (
                <div className="text-center py-8 bg-slate-950/40 rounded-lg border border-slate-800 border-dashed">
                  <Check className="h-6 w-6 text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-400">All quiet! No un-snoozed expiring ingredients.</p>
                </div>
              ) : (
                criticalItems.map((item) => {
                  const status = getExpirationStatus(item);
                  const isExpired = status === ExpirationStatus.EXPIRED;
                  
                  // Calculate days left
                  const expDate = new Date(item.expirationDate);
                  const today = new Date();
                  expDate.setHours(0, 0, 0, 0);
                  today.setHours(0, 0, 0, 0);
                  const daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <div 
                      key={item.id} 
                      className={`p-2.5 rounded-lg border flex flex-col gap-2 transition-colors ${
                        isExpired 
                          ? "bg-red-500/5 border-red-500/20" 
                          : "bg-amber-500/5 border-amber-500/10"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${isExpired ? "bg-red-500" : "bg-amber-500 animate-pulse"}`} />
                            <h5 className="text-xs font-sans font-medium text-white break-words">{item.name}</h5>
                          </div>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {isExpired 
                              ? "Expired!" 
                              : daysLeft === 0 
                                ? "Expires TODAY!" 
                                : `Expires in ${daysLeft} days`} ({item.expirationDate})
                          </p>
                        </div>
                        <span className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                          {item.quantity} {item.unit}
                        </span>
                      </div>

                      {/* Action buttons inside Notification Alert */}
                      <div className="flex justify-end gap-1.5 border-t border-slate-800/50 pt-1.5 mt-0.5">
                        <button
                          onClick={() => handleSnoozeItem(item.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded text-[10px] transition-colors"
                          title="Snooze warning chime for this session"
                        >
                          <Clock className="h-3 w-3" />
                          <span>Snooze Alarm</span>
                        </button>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-red-950/40 hover:bg-red-900/40 border border-red-900/30 text-red-400 hover:text-red-300 rounded text-[10px] transition-colors"
                          title="Discard / Trash food item"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Trash</span>
                        </button>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 0)}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-900/30 text-emerald-400 hover:text-emerald-300 rounded text-[10px] transition-colors"
                          title="Consume ingredient completely"
                        >
                          <Check className="h-3 w-3" />
                          <span>Used</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Warning Footer Banner */}
            {criticalItems.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-800/80 text-[10px] text-slate-400 font-sans flex items-center justify-between">
                <span>⚠️ Eat these soon to prevent waste!</span>
                <button
                  onClick={() => {
                    // Snooze all critical items instantly
                    const batch: Record<string, boolean> = {};
                    criticalItems.forEach(i => batch[i.id] = true);
                    setSnoozedItems(prev => ({ ...prev, ...batch }));
                  }}
                  className="text-red-400 hover:text-red-300 font-semibold"
                >
                  Silence All
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
