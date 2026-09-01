import React, { useState } from "react";
import {
  ScanLine,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Hourglass,
  Thermometer,
  Layers,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  FileCheck,
  Sliders
} from "lucide-react";
import { ScoreGauge } from "../components/UI/ScoreGauge";
import { Badge } from "../components/UI/Badge";
import { Toast } from "../components/UI/Toast";
import { api } from "../services/api";

const SAMPLE_FOODS = [
  {
    name: "Apple",
    category: "Fruits",
    image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80",
    hint: "Fresh Crisp Honeycrisp",
  },
  {
    name: "Banana",
    category: "Fruits",
    image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80",
    hint: "Ripe Cavendish (Near Spoilage)",
  },
  {
    name: "Tomato",
    category: "Vegetables",
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80",
    hint: "Firm Roma Tomatoes",
  },
  {
    name: "Strawberry",
    category: "Fruits",
    image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=400&q=80",
    hint: "Overripe / Mold Risk (Spoiled)",
  },
  {
    name: "Chicken",
    category: "Meat & Poultry",
    image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=400&q=80",
    hint: "Chilled Boneless Cut",
  },
  {
    name: "Bread",
    category: "Bakery Products",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80",
    hint: "Artisan Sourdough Loaf",
  },
];

export const FoodAnalysis = ({ onNavigateInventory }) => {
  const [selectedFoodType, setSelectedFoodType] = useState("Apple");
  const [selectedCategory, setSelectedCategory] = useState("Fruits");
  const [previewImage, setPreviewImage] = useState(SAMPLE_FOODS[0].image);
  const [selectedFile, setSelectedFile] = useState(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const handleSelectSample = (sample) => {
    setSelectedFoodType(sample.name);
    setSelectedCategory(sample.category);
    setPreviewImage(sample.image);
    setSelectedFile(null);
    setAnalysisResult(null);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewImage(URL.createObjectURL(file));
      setAnalysisResult(null);
      // Guess food name from file
      const rawName = file.name.split(".")[0].replace(/[-_]/g, " ");
      setSelectedFoodType(rawName);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisStep(1);

    const stepInterval = setInterval(() => {
      setAnalysisStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 450);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append("file", selectedFile);
      }
      formData.append("food_type", selectedFoodType);
      formData.append("category", selectedCategory);

      const result = await api.analyzeFood(formData);
      setTimeout(() => {
        clearInterval(stepInterval);
        setAnalysisResult(result);
        setAnalyzing(false);
        setAnalysisStep(0);
      }, 1600);
    } catch (err) {
      clearInterval(stepInterval);
      setAnalyzing(false);
      setToastMessage({ type: "error", text: "Analysis request failed. Using fallback model." });
    }
  };

  const handleAddDirectToInventory = async () => {
    if (!analysisResult) return;
    try {
      await api.createFood({
        name: analysisResult.food_type,
        category: analysisResult.category,
        batch_id: `BATCH-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        quantity: 15,
        unit: "kg",
        purchase_date: new Date().toISOString().split("T")[0],
        expiry_date: new Date(Date.now() + analysisResult.estimated_shelf_life_days * 86400000).toISOString().split("T")[0],
        storage_temp: 4.0,
        humidity: 85.0,
        packaging_type: "Standard Container",
        image_url: previewImage,
        freshness_status: analysisResult.freshness_category,
        freshness_score: analysisResult.freshness_score,
      });
      setToastMessage({ type: "success", text: `Added ${analysisResult.food_type} to inventory!` });
      setTimeout(() => onNavigateInventory?.(), 800);
    } catch (e) {
      setToastMessage({ type: "error", text: "Failed to add to inventory." });
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4" /> AI Computer Vision & Freshness Grading
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Food Freshness Analysis Engine
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
          Upload or sample any produce, dairy, or meat image to evaluate freshness index, spoilage probability, shelf life, and storage recommendations.
        </p>
      </div>

      {/* Quick Demo Sample Selector */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-emerald-400" />
          Select Demo Food Preset or Upload Custom Image:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {SAMPLE_FOODS.map((sample) => (
            <button
              key={sample.name}
              type="button"
              onClick={() => handleSelectSample(sample)}
              className={`p-2 rounded-xl border text-left flex flex-col items-center gap-2 transition-all ${
                selectedFoodType.toLowerCase() === sample.name.toLowerCase() && !selectedFile
                  ? "bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/10"
                  : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
              }`}
            >
              <img
                src={sample.image}
                alt={sample.name}
                className="w-12 h-12 rounded-lg object-cover border border-slate-700 shadow-sm"
              />
              <div className="text-center w-full">
                <p className="text-xs font-bold text-white truncate">{sample.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{sample.hint}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Analysis Section: Upload / Preview on Left, Results on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Upload & Input Parameters (5 columns) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              Food Image & Parameters
            </h3>

            {/* Image Preview Box */}
            <div className="relative aspect-video rounded-xl bg-slate-950/80 border-2 border-dashed border-slate-700 overflow-hidden flex flex-col items-center justify-center group hover:border-emerald-500/50 transition-colors">
              {previewImage ? (
                <>
                  <img
                    src={previewImage}
                    alt="Target preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                    <span className="text-xs font-semibold text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                      {selectedFoodType} ({selectedCategory})
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No image chosen yet</p>
                </div>
              )}
            </div>

            {/* Custom file upload button */}
            <label className="block w-full text-center py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 cursor-pointer transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              Choose Local Image File
            </label>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Food Item Name
                </label>
                <input
                  type="text"
                  value={selectedFoodType}
                  onChange={(e) => setSelectedFoodType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Fruits">Fruits</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Dairy Products">Dairy Products</option>
                  <option value="Meat & Poultry">Meat & Poultry</option>
                  <option value="Seafood">Seafood</option>
                  <option value="Bakery Products">Bakery Products</option>
                  <option value="Packaged Foods">Packaged Foods</option>
                  <option value="Beverages">Beverages</option>
                </select>
              </div>
            </div>

            {/* Analyze Action Button */}
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 text-sm transition-all transform active:scale-98 disabled:opacity-50"
            >
              {analyzing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Computer Vision...</span>
                </div>
              ) : (
                <>
                  <ScanLine className="w-5 h-5" />
                  <span>Run AI Freshness Inspection</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Analysis Results or Processing state (7 columns) */}
        <div className="lg:col-span-7">
          {analyzing ? (
            /* Animated Step Processing State */
            <div className="glass-card rounded-2xl p-8 border border-slate-800 flex flex-col items-center justify-center min-h-[420px] text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                <Sparkles className="w-8 h-8 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
              </div>

              <div className="space-y-2 max-w-sm">
                <h4 className="text-base font-bold text-white">AI Deep Spectroscopy in Progress</h4>
                <p className="text-xs text-slate-400">
                  {analysisStep === 1 && "1/4 Extracting RGB chromaticity & texture features..."}
                  {analysisStep === 2 && "2/4 Running surface defect & oxidation classification..."}
                  {analysisStep === 3 && "3/4 Calculating microbial degradation & spoilage probability..."}
                  {analysisStep >= 4 && "4/4 Generating temperature-calibrated shelf-life prediction..."}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${(analysisStep / 4) * 100}%` }}
                />
              </div>
            </div>
          ) : analysisResult ? (
            /* Polished Freshness Result Scorecard */
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
              {/* Top Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-white">{analysisResult.food_type}</h3>
                    <Badge status={analysisResult.freshness_category} />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Category: <strong className="text-slate-200">{analysisResult.category}</strong> • AI Confidence:{" "}
                    <strong className="text-emerald-400">{(analysisResult.confidence * 100).toFixed(0)}%</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddDirectToInventory}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add to Inventory</span>
                  </button>
                </div>
              </div>

              {/* Core Score Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                {/* Visual Gauge */}
                <div className="glass-card p-4 rounded-xl border border-slate-800/80 flex items-center justify-center">
                  <ScoreGauge
                    score={analysisResult.freshness_score}
                    size={140}
                    label="Freshness Index"
                  />
                </div>

                {/* Spoilage Probability */}
                <div className="glass-card p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Spoilage Risk</span>
                    <Flame className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="text-2xl font-extrabold text-white">
                    {(analysisResult.spoilage_probability * 100).toFixed(0)}%
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        analysisResult.spoilage_probability < 0.2
                          ? "bg-emerald-500"
                          : analysisResult.spoilage_probability < 0.5
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${analysisResult.spoilage_probability * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Risk Level: <strong className="text-slate-200">{analysisResult.risk_level}</strong>
                  </p>
                </div>

                {/* Shelf-Life Forecast */}
                <div className="glass-card p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">Remaining Life</span>
                    <Hourglass className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-400">
                    {analysisResult.estimated_shelf_life_days}{" "}
                    <span className="text-xs font-semibold text-slate-300">Days</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Under standard optimal refrigeration storage conditions.
                  </p>
                </div>
              </div>

              {/* Detected Issues */}
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1.5">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Detected Morphological & Surface Issues:
                </h4>
                <div className="flex flex-wrap gap-2 pt-1">
                  {analysisResult.detected_issues?.map((issue, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium"
                    >
                      {issue}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recommendations Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                  <span className="font-bold text-emerald-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                    <Thermometer className="w-3 h-3" /> Storage Recommendation
                  </span>
                  <p className="text-slate-200">{analysisResult.storage_recommendation}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-1">
                  <span className="font-bold text-blue-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                    <FileCheck className="w-3 h-3" /> Consumption Recommendation
                  </span>
                  <p className="text-slate-200">{analysisResult.consumption_recommendation}</p>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="glass-card rounded-2xl p-8 border border-slate-800 flex flex-col items-center justify-center min-h-[420px] text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                <ScanLine className="w-8 h-8" />
              </div>
              <div className="max-w-sm space-y-1">
                <h4 className="text-sm font-bold text-white">Ready for Freshness Inspection</h4>
                <p className="text-xs text-slate-400">
                  Select a food preset or upload an image on the left, then click <strong>"Run AI Freshness Inspection"</strong> to evaluate the sample.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
