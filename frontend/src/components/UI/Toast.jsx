import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

export const Toast = ({ message, type = "success", duration = 4000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
  };

  const borders = {
    success: "border-emerald-500/40 bg-slate-900/90 text-emerald-300",
    warning: "border-amber-500/40 bg-slate-900/90 text-amber-300",
    error: "border-red-500/40 bg-slate-900/90 text-red-300",
    info: "border-blue-500/40 bg-slate-900/90 text-blue-300",
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md ${borders[type]}`}
      >
        {icons[type]}
        <span className="text-sm font-medium text-white">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
