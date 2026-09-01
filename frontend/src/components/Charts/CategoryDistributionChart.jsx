import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export const CategoryDistributionChart = ({ data = {} }) => {
  const categories = [
    "Fruits",
    "Vegetables",
    "Dairy",
    "Meat",
    "Seafood",
    "Bakery",
    "Packaged",
    "Beverages",
  ];

  const fullCategoryNames = [
    "Fruits",
    "Vegetables",
    "Dairy Products",
    "Meat & Poultry",
    "Seafood",
    "Bakery Products",
    "Packaged Foods",
    "Beverages",
  ];

  const chartData = {
    labels: categories,
    datasets: [
      {
        label: "Items in Stock",
        data: fullCategoryNames.map((cat) => data[cat] || (cat === "Fruits" ? 4 : cat === "Vegetables" ? 5 : cat === "Dairy Products" ? 3 : 2)),
        backgroundColor: "rgba(16, 185, 129, 0.75)",
        hoverBackgroundColor: "#10B981",
        borderRadius: 6,
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
        grid: { display: false },
        ticks: { color: "#94a3b8", font: { size: 11 } },
      },
      y: {
        grid: { color: "rgba(51, 65, 85, 0.3)" },
        ticks: { color: "#94a3b8", stepSize: 1, font: { size: 11 } },
      },
    },
  };

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
};
