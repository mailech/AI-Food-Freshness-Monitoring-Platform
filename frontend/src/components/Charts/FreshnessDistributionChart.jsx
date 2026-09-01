import React from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

export const FreshnessDistributionChart = ({ data = {} }) => {
  const chartData = {
    labels: ["Fresh", "Good", "Acceptable", "Near Spoilage", "Spoiled"],
    datasets: [
      {
        data: [
          data["Fresh"] || 52,
          data["Good"] || 30,
          data["Acceptable"] || 20,
          data["Near Spoilage"] || 18,
          data["Spoiled"] || 8,
        ],
        backgroundColor: [
          "#10B981", // Emerald
          "#3B82F6", // Blue
          "#F59E0B", // Amber
          "#F97316", // Orange
          "#EF4444", // Red
        ],
        borderColor: "#0f172a",
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "72%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#94a3b8",
          font: { size: 11, family: "Inter" },
          padding: 12,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#f8fafc",
        bodyColor: "#cbd5e1",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      },
    },
  };

  return (
    <div className="h-64 relative flex items-center justify-center">
      <Doughnut data={chartData} options={options} />
    </div>
  );
};
