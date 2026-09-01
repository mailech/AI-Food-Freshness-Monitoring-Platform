import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const StorageConditionChart = ({ trends = [] }) => {
  const labels = trends.length > 0
    ? trends.map((t) => t.time)
    : ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"];

  const temperatures = trends.length > 0
    ? trends.map((t) => t.temperature)
    : [3.4, 3.2, 3.5, 3.8, 3.6, 3.3, 3.4];

  const humidities = trends.length > 0
    ? trends.map((t) => t.humidity)
    : [86.5, 87.0, 85.8, 86.2, 87.4, 86.1, 86.5];

  const chartData = {
    labels,
    datasets: [
      {
        label: "Temperature (°C)",
        data: temperatures,
        borderColor: "#3B82F6",
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        yAxisID: "y",
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: "Humidity (% RH)",
        data: humidities,
        borderColor: "#10B981",
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        yAxisID: "y1",
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#94a3b8",
          font: { size: 11 },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#f8fafc",
        bodyColor: "#cbd5e1",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(51, 65, 85, 0.2)" },
        ticks: { color: "#94a3b8", font: { size: 10 } },
      },
      y: {
        type: "linear",
        display: true,
        position: "left",
        grid: { color: "rgba(51, 65, 85, 0.2)" },
        ticks: {
          color: "#60a5fa",
          font: { size: 10 },
          callback: (v) => `${v}°C`,
        },
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        grid: { drawOnChartArea: false },
        ticks: {
          color: "#34d399",
          font: { size: 10 },
          callback: (v) => `${v}%`,
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
