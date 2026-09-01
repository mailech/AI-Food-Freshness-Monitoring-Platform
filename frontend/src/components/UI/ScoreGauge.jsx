import React from "react";

export const ScoreGauge = ({ score = 85, size = 160, strokeWidth = 14, label = "Freshness Score" }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s) => {
    if (s >= 80) return "#10B981"; // Emerald
    if (s >= 65) return "#3B82F6"; // Blue
    if (s >= 50) return "#F59E0B"; // Amber
    if (s >= 35) return "#F97316"; // Orange
    return "#EF4444"; // Red
  };

  const getStatusText = (s) => {
    if (s >= 80) return "Fresh";
    if (s >= 65) return "Good";
    if (s >= 50) return "Acceptable";
    if (s >= 35) return "Near Spoilage";
    return "Spoiled";
  };

  const activeColor = getColor(score);

  return (
    <div className="flex flex-col items-center justify-center relative">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(51, 65, 85, 0.4)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={activeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: "stroke-dashoffset 0.8s ease-in-out, stroke 0.5s ease",
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold text-white tracking-tight">
            {score}
            <span className="text-sm font-semibold text-slate-400">/100</span>
          </span>
          <span
            className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1"
            style={{ color: activeColor, backgroundColor: `${activeColor}20` }}
          >
            {getStatusText(score)}
          </span>
        </div>
      </div>
      {label && <p className="text-xs font-medium text-slate-400 mt-2">{label}</p>}
    </div>
  );
};
