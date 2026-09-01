import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const FreshnessTrendChart = ({ trendData = [] }) => {
  const labels = trendData.length > 0
    ? trendData.map((d) => d.day)
    : ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Today"];

  const scores = trendData.length > 0
    ? trendData.map((d) => d.avg_score)
    : [88, 86, 85, 87, 83, 85, 84];

  const chartData = {
    labels,
    datasets: [
      {
        label: "Avg Freshness Index (%)",
        data: scores,
        borderColor: "#10B981",
        backgroundColor: "rgba(16, 185, 129, 0.15)",
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "#10B981",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
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
    scales: {
      x: {
        grid: { color: "rgba(51, 65, 85, 0.2)" },
        ticks: { color: "#94a3b8", font: { size: 11 } },
      },
      y: {
        min: 60,
        max: 100,
        grid: { color: "rgba(51, 65, 85, 0.3)" },
        ticks: {
          color: "#94a3b8",
          font: { size: 11 },
          callback: (value) => `${value}%`,
        },
      },
    },
  };

  return (
    <div className="h-64">
      <Line data={chartData} options={options} />
    </div>
  );
};
