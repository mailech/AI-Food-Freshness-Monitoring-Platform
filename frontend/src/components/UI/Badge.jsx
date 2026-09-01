import React from "react";

export const Badge = ({ status, className = "" }) => {
  const getBadgeStyle = () => {
    switch (status?.toLowerCase()) {
      case "fresh":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "good":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "acceptable":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "near spoilage":
        return "bg-orange-500/15 text-orange-400 border-orange-500/30";
      case "spoiled":
        return "bg-red-500/15 text-red-400 border-red-500/30 animate-pulse";
      case "normal":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "warning":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "critical":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      case "low":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "medium":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "high":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      default:
        return "bg-slate-700/50 text-slate-300 border-slate-600/40";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle()} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {status || "Unknown"}
    </span>
  );
};
