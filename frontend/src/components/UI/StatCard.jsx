import React from "react";

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive = true,
  color = "emerald",
}) => {
  const colorMap = {
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/30",
    blue: "from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/30",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/30",
    orange: "from-orange-500/20 to-orange-500/5 text-orange-400 border-orange-500/30",
    red: "from-red-500/20 to-red-500/5 text-red-400 border-red-500/30",
    purple: "from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/30",
  };

  return (
    <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-extrabold text-white mt-1 tracking-tight">{value}</h3>
        </div>
        {Icon && (
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.emerald} border flex items-center justify-center shadow-lg`}
          >
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-700/40">
        <span className="text-slate-400">{subtitle}</span>
        {trend && (
          <span
            className={`font-semibold flex items-center gap-1 ${
              trendPositive ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};
