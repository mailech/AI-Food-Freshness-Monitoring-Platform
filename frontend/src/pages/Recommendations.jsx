import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ThermometerSnowflake,
  Utensils,
  ArrowRightLeft,
  Trash2,
  CheckCircle2,
  Filter,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { Toast } from "../components/UI/Toast";
import { api } from "../services/api";

export const Recommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [filterType, setFilterType] = useState("All");
  const [toastMessage, setToastMessage] = useState(null);

  const fetchRecs = async () => {
    try {
      const data = await api.getRecommendations("All", filterType);
      setRecommendations(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRecs();
  }, [filterType]);

  const handleExecuteAction = (rec) => {
    setToastMessage({
      type: "success",
      text: `Action logged: "${rec.action_text}" successfully assigned!`,
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "storage":
        return <ThermometerSnowflake className="w-5 h-5 text-blue-400" />;
      case "consumption":
        return <Utensils className="w-5 h-5 text-emerald-400" />;
      case "inventory":
        return <ArrowRightLeft className="w-5 h-5 text-amber-400" />;
      case "waste_reduction":
        return <Trash2 className="w-5 h-5 text-teal-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-purple-400" />;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" /> Rule-Based & Heuristic Optimization Engine
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-400" />
            Operational Recommendations
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Actionable interventions across cold chain preservation, inventory rotation, and waste prevention.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 p-1 rounded-xl">
          {["All", "storage", "consumption", "inventory", "waste_reduction"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filterType === t
                  ? "bg-emerald-500 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-4">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 shadow">
                {getTypeIcon(rec.type)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-sm">{rec.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(rec.priority)}`}>
                    {rec.priority} Priority
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">{rec.description}</p>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 font-medium">
                  <span>Target: <strong className="text-emerald-400">{rec.food_name}</strong></span>
                  <span>•</span>
                  <span>Category: {rec.category}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleExecuteAction(rec)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-emerald-500/20 border border-slate-700 hover:border-emerald-500/40 text-slate-200 hover:text-emerald-300 text-xs font-bold transition-all whitespace-nowrap shadow"
            >
              <span>{rec.action_text}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
