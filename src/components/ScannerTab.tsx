import React, { useState, useRef, useEffect } from "react";
import { Upload, Camera, Trash2, Check, Loader2, Sparkles, AlertCircle, Edit2, Play, RefreshCw, X } from "lucide-react";
import { FoodCategory, StorageLocation, ReceiptScanResult } from "../types";

interface ScannerTabProps {
  onImportItems: (items: any[]) => void;
  hasGeminiKey: boolean;
}

export default function ScannerTab({ onImportItems, hasGeminiKey }: ScannerTabProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [scannedItems, setScannedItems] = useState<ReceiptScanResult[]>([]);
  const [scanResponseMocked, setScanResponseMocked] = useState(false);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // File drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up camera streams
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setImageSrc(null);
    setScannedItems([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera access failed:", err);
      alert("Could not access camera. Please ensure permissions are granted or upload an image instead.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setImageSrc(dataUrl);
        stopCamera();
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }
    setScannedItems([]);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageSrc(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Call the backend API to scan the image using Gemini
  const triggerScan = async () => {
    if (!imageSrc) return;
    setIsScanning(true);
    setScannedItems([]);

    const steps = [
      "Uploading snapshot to secure server...",
      "Activating Gemini 3.5 Flash visual intelligence...",
      "Detecting items & grocery textures...",
      "Extracting item descriptions & counts...",
      "Synthesizing food shelf life estimates...",
      "Finalizing ingredient schema..."
    ];

    let stepIndex = 0;
    setScanStatus(steps[0]);
    const statusInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length;
      setScanStatus(steps[stepIndex]);
    }, 1500);

    try {
      const response = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageSrc,
          mimeType: "image/jpeg",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to scan receipt image");
      }

      const data = await response.json();
      setScannedItems(data.items || []);
      setScanResponseMocked(!!data.isMock);
    } catch (err: any) {
      console.error(err);
      alert("Error parsing receipt: " + err.message);
    } finally {
      clearInterval(statusInterval);
      setIsScanning(false);
      setScanStatus("");
    }
  };

  // Remove single scanned item before import
  const removeScannedItem = (index: number) => {
    setScannedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Modify individual fields in the scanned results grid
  const updateScannedItem = (index: number, key: keyof ReceiptScanResult, value: any) => {
    setScannedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  };

  // Add a blank row to verified scan
  const addScannedRow = () => {
    const newRow: ReceiptScanResult = {
      name: "New Scanned Item",
      category: FoodCategory.VEGETABLES,
      quantity: 1,
      unit: "pcs",
      shelfLifeDays: 5,
    };
    setScannedItems((prev) => [...prev, newRow]);
  };

  // Commit verified items into refrigerator database
  const commitImport = () => {
    if (scannedItems.length === 0) return;

    const formattedItems = scannedItems.map((item) => {
      // Calculate expiration date based on shelfLifeDays
      const today = new Date();
      today.setDate(today.getDate() + (item.shelfLifeDays || 5));
      const expDateStr = today.toISOString().split("T")[0];

      return {
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        location: StorageLocation.FRIDGE, // Default to fridge on import
        purchaseDate: new Date().toISOString().split("T")[0],
        expirationDate: expDateStr,
        notes: "Imported via AI Scanner",
      };
    });

    onImportItems(formattedItems);
    setImageSrc(null);
    setScannedItems([]);
  };

  return (
    <div id="scanner-tab-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Visual Capture Center */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Camera className="h-4 w-4 text-emerald-400" />
            <span>AI Input Console</span>
          </h3>

          {/* Video or Image Canvas */}
          <div className="relative aspect-video w-full bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
            {isCameraActive ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
            ) : imageSrc ? (
              <div className="relative w-full h-full">
                <img
                  src={imageSrc}
                  alt="Scanned item preview"
                  className="w-full h-full object-contain"
                />
                {/* Visual scan overlay bar */}
                {isScanning && (
                  <div className="absolute inset-x-0 h-1 bg-emerald-400 shadow-[0_0_15px_#34d399] animate-[bounce_3s_infinite]" />
                )}
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer border-2 border-dashed transition-all ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-950/10"
                    : "border-slate-800 hover:border-slate-700 bg-slate-950"
                }`}
              >
                <Upload className="h-10 w-10 text-slate-600 mb-2" />
                <p className="text-sm text-slate-300 font-medium">Drag & drop grocery receipts or snapshot</p>
                <p className="text-xs text-slate-500 mt-1">Accepts PNG, JPG, JPEG</p>
                <button className="mt-3 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 text-xs font-semibold">
                  Browse Files
                </button>
              </div>
            )}

            {/* Floating Camera Button on Stream */}
            {isCameraActive && (
              <button
                onClick={capturePhoto}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-full shadow-lg transition-transform"
                title="Capture Picture"
              >
                <Check className="h-6 w-6" />
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Mode Switchers */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {isCameraActive ? (
              <button
                onClick={stopCamera}
                className="flex items-center justify-center gap-2 py-2 px-4 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-300 text-xs font-medium transition-colors"
              >
                <X className="h-4 w-4" />
                <span>Cancel Camera</span>
              </button>
            ) : (
              <button
                onClick={startCamera}
                className="flex items-center justify-center gap-2 py-2 px-4 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-300 text-xs font-medium transition-colors"
              >
                <Camera className="h-4 w-4 text-slate-400" />
                <span>Use Camera</span>
              </button>
            )}

            {imageSrc && (
              <button
                onClick={() => setImageSrc(null)}
                className="flex items-center justify-center gap-2 py-2 px-4 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-lg text-rose-400 text-xs font-medium transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Reset Image</span>
              </button>
            )}
          </div>

          {/* Scan trigger */}
          {imageSrc && !isScanning && scannedItems.length === 0 && (
            <button
              onClick={triggerScan}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white rounded-lg text-sm font-semibold shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Scan with Gemini AI</span>
            </button>
          )}

          {/* Scanning Loader Overlay */}
          {isScanning && (
            <div className="mt-4 bg-slate-950/60 border border-slate-800 rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mb-3" />
              <p className="text-sm font-medium text-white">{scanStatus}</p>
              <p className="text-xs text-slate-500 mt-1 font-mono">Standby — analyzing patterns</p>
            </div>
          )}
        </div>

        {/* Informative warning on key state */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-3">
          <AlertCircle className={`h-5 w-5 shrink-0 ${hasGeminiKey ? "text-emerald-400" : "text-amber-400 animate-pulse"}`} />
          <div className="text-xs">
            <h4 className="font-semibold text-slate-200">
              {hasGeminiKey ? "Gemini Live Scanning Ready" : "Gemini Simulator Engaged"}
            </h4>
            <p className="text-slate-400 mt-1 leading-relaxed">
              {hasGeminiKey
                ? "Your secret Gemini API key is active. Scanning utilizes multi-modal intelligence to extract real receipts and food captures."
                : "No custom API key detected. Using an intelligent receipt generator simulator to represent parsing structures. Add GEMINI_API_KEY to secrets to go live!"}
            </p>
          </div>
        </div>
      </div>

      {/* Scanned Verification Desk */}
      <div className="lg:col-span-7">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm h-full flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>Verification & Adjustments</span>
              </h3>

              {scannedItems.length > 0 && (
                <button
                  onClick={addScannedRow}
                  className="px-2 py-1 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded text-[11px] font-mono text-slate-300"
                >
                  + Add Row
                </button>
              )}
            </div>

            {scannedItems.length === 0 ? (
              <div className="text-center py-16 bg-slate-950 border border-dashed border-slate-800 rounded-lg">
                <Sparkles className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Scan or upload an image to populate verification desk.</p>
                <p className="text-xs text-slate-600 mt-1">Once parsed, ingredients will display here for review.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {scanResponseMocked && (
                  <div className="bg-amber-950/20 border border-amber-900/30 text-amber-400 rounded-lg p-3 text-xs flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Using simulated shopping catalog. Review and edit values before importing.</span>
                  </div>
                )}

                <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                        <th className="p-3">Ingredient Name</th>
                        <th className="p-3 w-28">Category</th>
                        <th className="p-3 w-20">Qty</th>
                        <th className="p-3 w-20">Unit</th>
                        <th className="p-3 w-20">Shelf (Days)</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {scannedItems.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-900/40">
                          {/* Name field */}
                          <td className="p-2">
                            <input
                              type="text"
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-800 focus:border-emerald-500 px-1 py-0.5 outline-none text-xs text-white"
                              value={item.name}
                              onChange={(e) => updateScannedItem(index, "name", e.target.value)}
                            />
                          </td>
                          {/* Category field */}
                          <td className="p-2">
                            <select
                              className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-slate-300 text-[11px]"
                              value={item.category}
                              onChange={(e) => updateScannedItem(index, "category", e.target.value as FoodCategory)}
                            >
                              {Object.values(FoodCategory).map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </td>
                          {/* Quantity */}
                          <td className="p-2">
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-800 focus:border-emerald-500 px-1 py-0.5 outline-none text-xs"
                              value={item.quantity}
                              onChange={(e) => updateScannedItem(index, "quantity", Number(e.target.value))}
                            />
                          </td>
                          {/* Unit */}
                          <td className="p-2">
                            <input
                              type="text"
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-800 focus:border-emerald-500 px-1 py-0.5 outline-none text-xs"
                              value={item.unit}
                              onChange={(e) => updateScannedItem(index, "unit", e.target.value)}
                            />
                          </td>
                          {/* Shelf life days */}
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-800 focus:border-emerald-500 px-1 py-0.5 outline-none text-xs text-amber-400 font-mono font-medium"
                              value={item.shelfLifeDays}
                              onChange={(e) => updateScannedItem(index, "shelfLifeDays", Number(e.target.value))}
                            />
                          </td>
                          {/* Delete row */}
                          <td className="p-2 text-center">
                            <button
                              onClick={() => removeScannedItem(index)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Verified Import button */}
          {scannedItems.length > 0 && (
            <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-400 font-mono">
                {scannedItems.length} items ready to import
              </span>
              <button
                onClick={commitImport}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all"
              >
                <Check className="h-4 w-4" />
                <span>Import Verified Items</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
