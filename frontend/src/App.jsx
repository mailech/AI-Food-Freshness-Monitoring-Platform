import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./Login";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import Inventory from "./Inventory";
import FoodBatches from "./FoodBatches";
import FreshnessHistory from "./FreshnessHistory";
import Recommendations from "./Recommendations";
import Alerts from "./Alerts";
import Reports from "./Reports";
import Settings from "./Settings";
import StorageMonitoring from "./StorageMonitoring";
import "./App.css";

const ROLE_PERMISSIONS = {
  admin: [
    "Dashboard",
    "Analyze Food",
    "Inventory",
    "Food Batches",
    "Storage Monitoring",
    "Freshness History",
    "Recommendations",
    "Alerts",
    "Reports",
    "Settings",
  ],

  consumer: [
    "Dashboard",
    "Analyze Food",
    "Freshness History",
    "Recommendations",
  ],

  retail_manager: [
    "Dashboard",
    "Analyze Food",
    "Inventory",
    "Food Batches",
    "Freshness History",
    "Recommendations",
    "Alerts",
    "Reports",
  ],

  warehouse_operator: [
    "Dashboard",
    "Inventory",
    "Food Batches",
    "Storage Monitoring",
    "Freshness History",
    "Recommendations",
    "Alerts",
  ],

  quality_inspector: [
    "Dashboard",
    "Analyze Food",
    "Storage Monitoring",
    "Freshness History",
    "Recommendations",
    "Alerts",
    "Reports",
  ],
};
function ProtectedDashboard() {
  const token = localStorage.getItem("foodfresh_access_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Dashboard />;
}
function Dashboard() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const storedUser = JSON.parse(localStorage.getItem("foodfresh_user") || "null");
  const currentUser = storedUser || { name: "User", email: "", role: "user" };
  const isAdmin = currentUser.role === "admin";
  const allowedPages =
  ROLE_PERMISSIONS[currentUser.role] ||
  ROLE_PERMISSIONS.consumer;
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [alertCount, setAlertCount] = useState(() => {
  const savedAlerts = JSON.parse(
    localStorage.getItem("foodfresh_alerts") || "[]"
  );

  return savedAlerts.filter(
    (alert) => alert.unread
  ).length;
});
const [dashboardStats, setDashboardStats] = useState({
  total: 0,
  fresh: 0,
  good: 0,
  acceptable: 0,
  nearSpoilage: 0,
  spoiled: 0,
  averageScore: 0,
});
const [freshnessTrend, setFreshnessTrend] = useState([]);
const [trendDates, setTrendDates] = useState([]);
const [dashboardRecommendations, setDashboardRecommendations] = useState([]);

const [dashboardPeriod, setDashboardPeriod] = useState(30);
const [trendPeriod, setTrendPeriod] = useState(7);
const [dashboardHistory, setDashboardHistory] = useState([]);
const loadDashboardStats = async () => {
  try {
    const token = localStorage.getItem("foodfresh_access_token");

    if (!token) return;

    const response = await fetch(
      "http://127.0.0.1:8000/history",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data?.message ||
        data?.detail ||
        "Failed to load dashboard statistics"
      );
    }

    const now = new Date();
const history = (data.history || []).filter((item) => {
      if (!item.created_at) return true;

      const createdDate = new Date(item.created_at);
      const difference =
        (now - createdDate) / (1000 * 60 * 60 * 24);

      return difference <= dashboardPeriod;
    });
setDashboardHistory(history);
    const scores = history
      .map((item) => Number(item.freshness_score))
      .filter((score) => !isNaN(score));

    setDashboardStats({
      total: history.length,

      fresh: history.filter(
        (item) => item.classification === "Fresh"
      ).length,

      good: history.filter(
        (item) => item.classification === "Good"
      ).length,

      acceptable: history.filter(
        (item) => item.classification === "Acceptable"
      ).length,

      nearSpoilage: history.filter(
        (item) => item.classification === "Near Spoilage"
      ).length,

      spoiled: history.filter(
        (item) => item.classification === "Spoiled"
      ).length,

      averageScore:
        scores.length > 0
          ? Math.round(
              scores.reduce(
                (sum, score) => sum + score,
                0
              ) / scores.length
            )
          : 0,
    });

  } catch (error) {
    console.error(
      "Dashboard stats error:",
      error
    );
  }
};
const loadFreshnessTrend = async () => {
  try {
    const token = localStorage.getItem("foodfresh_access_token");

    if (!token) return;

    const response = await fetch(
      "http://127.0.0.1:8000/history",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data?.message ||
        data?.detail ||
        "Failed to load freshness trend"
      );
    }

    const history = data.history || [];
    const today = new Date();

    // Create the selected number of calendar days
    const days = [];

    for (let i = trendPeriod - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(today.getDate() - i);
      days.push(date);
    }

    const scoresByDate = {};

    history.forEach((item) => {
      if (!item.created_at) return;

      const date = new Date(item.created_at);

      const dateKey = date.toLocaleDateString("en-CA");

      const score = Number(item.freshness_score);

      if (!isNaN(score)) {
        if (!scoresByDate[dateKey]) {
          scoresByDate[dateKey] = [];
        }

        scoresByDate[dateKey].push(score);
      }
    });

    const trendScores = [];
    const trendLabels = [];
    const trendHasData = [];

    days.forEach((day) => {
      const dateKey = day.toLocaleDateString("en-CA");

      const scores = scoresByDate[dateKey];

      if (scores && scores.length > 0) {
        const average =
          scores.reduce((sum, score) => sum + score, 0) /
          scores.length;

        trendScores.push(Math.round(average));
        trendHasData.push(true);
      } else {
        trendScores.push(null);
        trendHasData.push(false);
      }

      trendLabels.push(
        day.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        })
      );
    });

    setFreshnessTrend(trendScores);
    setTrendDates(trendLabels);

  } catch (error) {
    console.error(
      "Freshness trend error:",
      error
    );
  }
};
const loadDashboardRecommendations = () => {
  const recommendations = JSON.parse(
    localStorage.getItem("foodfresh_recommendations") || "[]"
  );

  setDashboardRecommendations(recommendations.slice(0, 2));
};
useEffect(() => {
  loadDashboardStats();
}, [dashboardPeriod]);

useEffect(() => {
  loadFreshnessTrend();
}, [trendPeriod]);

useEffect(() => {
  loadDashboardRecommendations();
}, []);
const getDistributionPercentage = (count) => {
  if (dashboardStats.total === 0) return 0;

  return Math.round(
    (count / dashboardStats.total) * 100
  );
};
  // Storage & product information
  const [temperature, setTemperature] = useState(6);
  const [humidity, setHumidity] = useState(65);
  const [storageDuration, setStorageDuration] = useState(0);
  const [productAgeDays, setProductAgeDays] = useState(0);
  const [airCirculation, setAirCirculation] = useState("Good");
  const [lightExposure, setLightExposure] = useState("Low");
  const [packaging, setPackaging] = useState("Proper");
const allMenuItems = [
  { name: "Dashboard", icon: "▦" },
  { name: "Analyze Food", icon: "⌁" },
  { name: "Inventory", icon: "▤" },
  { name: "Food Batches", icon: "▥" },
  { name: "Storage Monitoring", icon: "▣" },
  { name: "Freshness History", icon: "◷" },
  { name: "Recommendations", icon: "✦" },
  { name: "Alerts", icon: "⚠" },
  { name: "Reports", icon: "▥" },
  { name: "Settings", icon: "⚙" },
];

const menuItems = allMenuItems.filter(
  (item) => allowedPages.includes(item.name)
);
  // =========================
  // FILE UPLOAD
  // =========================

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image.");
      return;
    }

    // Remove old preview URL
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    const newPreview = URL.createObjectURL(file);

    setSelectedFile(file);
    setPreview(newPreview);
    setAnalysisResult(null);

    // Allows selecting the same image again
    event.target.value = "";
  };

  // =========================
  // CLEAR / NEW ANALYSIS
  // =========================

  const handleNewAnalysis = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setSelectedFile(null);
    setPreview(null);
    setAnalysisResult(null);
    setAnalyzing(false);
  };

  // =========================
  // BACK TO DASHBOARD
  // =========================

  const handleBackToDashboard = () => {
    handleNewAnalysis();
    setActivePage("Dashboard");
  };

 // =========================
// ANALYZE IMAGE
// =========================

const handleAnalyze = async () => {
  if (!selectedFile) {
    alert("Please select a food image first.");
    return;
  }

  setAnalyzing(true);
  setAnalysisResult(null);

  try {
    const formData = new FormData();

    // Food image
    formData.append("file", selectedFile);

    // Storage & product information
    formData.append("temperature", temperature);
    formData.append("humidity", humidity);
    formData.append("storage_duration", storageDuration);
    formData.append("product_age_days", productAgeDays);
    formData.append("air_circulation", airCirculation);
    formData.append("light_exposure", lightExposure);
    formData.append("packaging", packaging);

const token = localStorage.getItem(
  "foodfresh_access_token"
);


const response = await fetch(
  "http://127.0.0.1:8000/analyze",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  }
);

const responseText = await response.text();

let data;

try {
  data = responseText ? JSON.parse(responseText) : null;
} catch (parseError) {
  console.error("Invalid backend response:", responseText);

  throw new Error(
    `Backend returned an invalid response (${response.status}).`
  );
}

if (!response.ok) {
  throw new Error(
    data?.message ||
    data?.detail ||
    `Analysis failed with status ${response.status}`
  );
}

if (!data || !data.success) {
  throw new Error(
    data?.message ||
    "Analysis failed. Backend returned no valid result."
  );
}

setAnalysisResult(data.result);
const result = data.result;

const foodEmojiMap = {
  Apple: "🍎",
  Banana: "🍌",
  Bellpepper: "🫑",
  Carrot: "🥕",
  Cucumber: "🥒",
  Grape: "🍇",
  Guava: "🍈",
  Jujube: "🫒",
  Mango: "🥭",
  Orange: "🍊",
  Pomegranate: "🍎",
  Potato: "🥔",
  Strawberry: "🍓",
  Tomato: "🍅"
};

const historyEmoji = foodEmojiMap[result.food] || "🍎";

const now = new Date();

const historyItem = {
  id: Date.now(),
  food: result.food,
  emoji: historyEmoji,
  batchId: `AI-${Date.now().toString().slice(-6)}`,
  freshness: result.classification,
  score: Number(result.freshness_score),
  confidence: Number(result.confidence),
  shelfLife: result.shelf_life,
  date: now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }),
  time: now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  }),

  visualScore: result.visual_score,
  storageScore: result.storage_score,
  shelfLifeScore: result.shelf_life_score,
  productAgeScore: result.product_age_score,

  visualAnalysis: result.visual_analysis || null,
  storage: result.storage || null
};

const existingHistory = JSON.parse(
  localStorage.getItem("foodfresh_history") || "[]"
);

localStorage.setItem(
  "foodfresh_history",
  JSON.stringify([
    historyItem,
    ...existingHistory
  ])
);
// ==========================================
// SAVE AI RESULT TO RECOMMENDATIONS
// ==========================================

const existingRecommendations = JSON.parse(
  localStorage.getItem("foodfresh_recommendations") || "[]"
);

let aiRecommendation;

if (result.classification === "Spoiled") {
  aiRecommendation = {
    id: Date.now(),
    food: result.food,
    emoji: historyEmoji,
    status: "Spoiled",
    priority: "Critical",
    title: `Remove ${result.food}`,
    message:
      `${result.food} has been classified as spoiled. ` +
      `Remove it from usable inventory immediately.`,
    action: "Remove from inventory",
    category: "Safety"
  };
} else if (result.classification === "Near Spoilage") {
  aiRecommendation = {
    id: Date.now(),
    food: result.food,
    emoji: historyEmoji,
    status: "Near Spoilage",
    priority: "High",
    title: `Use ${result.food} Soon`,
    message:
      `${result.food} is approaching spoilage. ` +
      `Prioritize consumption before the remaining shelf life ends.`,
    action: "Consume soon",
    category: "Food Usage"
  };
} else if (result.classification === "Acceptable") {
  aiRecommendation = {
    id: Date.now(),
    food: result.food,
    emoji: historyEmoji,
    status: "Acceptable",
    priority: "Medium",
    title: `Monitor ${result.food}`,
    message:
      `${result.food} is acceptable but should be monitored regularly ` +
      `to maintain quality.`,
    action: "Monitor condition",
    category: "Monitoring"
  };
} else {
  aiRecommendation = {
    id: Date.now(),
    food: result.food,
    emoji: historyEmoji,
    status: result.classification,
    priority: "Low",
    title: `Maintain ${result.food} Storage`,
    message:
      `${result.food} is currently in ${result.classification.toLowerCase()} ` +
      `condition. Continue appropriate storage practices.`,
    action: "Continue storage",
    category: "Storage"
  };
}

localStorage.setItem(
  "foodfresh_recommendations",
  JSON.stringify([
    aiRecommendation,
    ...existingRecommendations
  ])
);
// ==========================================
// AI ANALYSIS ALERT + INVENTORY + BATCH
// ==========================================

const resultEmoji = foodEmojiMap[result.food] || "🥗";
const resultBatch = `AI-${Date.now().toString().slice(-6)}`;

const newAlert = {
  id: Date.now(),
  food: result.food || "Unknown Food",
  emoji: resultEmoji,
  batch: resultBatch,
  type: result.classification,
  severity:
    result.classification === "Spoiled"
      ? "Critical"
      : "High",
  title:
    result.classification === "Spoiled"
      ? "Food Spoilage Detected"
      : "Food Near Spoilage",
  message:
    result.classification === "Spoiled"
      ? `${result.food} has been classified as spoiled by the AI freshness analysis. Remove the item from usable inventory immediately.`
      : `${result.food} is approaching spoilage. Prioritize consumption and inspect the associated batch.`,
  freshnessScore: Number(result.freshness_score),
  confidence: Number(result.confidence),
  remainingDays: Number(result.remaining_days),
  shelfLife: result.shelf_life,
  visualScore: Number(result.visual_score),
  storageScore: Number(result.storage_score),
  detectedAt: new Date().toISOString(),
  time: "Just now",
  unread: true,
  source: "AI Analysis"
};


// ==========================================
// AUTOMATIC SPOILAGE ALERT
// ==========================================

if (
  result.classification === "Near Spoilage" ||
  result.classification === "Spoiled"
) {
  const existingAlerts = JSON.parse(
    localStorage.getItem("foodfresh_alerts") || "[]"
  );

  const isSpoiled =
    result.classification === "Spoiled";

  const updatedAlerts = [
    newAlert,
    ...existingAlerts
  ];

  localStorage.setItem(
    "foodfresh_alerts",
    JSON.stringify(updatedAlerts)
  );

  setAlertCount(prev => prev + 1);

  alert(
    `${isSpoiled
      ? "🚨 SPOILAGE ALERT"
      : "⚠️ NEAR SPOILAGE ALERT"}\n\n` +
    `${result.food}\n\n` +
    `Freshness Score: ${result.freshness_score}/100\n` +
    `Classification: ${result.classification}\n` +
    `Remaining Shelf Life: ${result.shelf_life}\n\n` +
    `${newAlert.message}`
  );
}


// ==========================================
// FOOD CATEGORY
// ==========================================

const foodCategories = {
  Apple: "Fruit",
  Banana: "Fruit",
  Bellpepper: "Vegetable",
  Carrot: "Vegetable",
  Cucumber: "Vegetable",
  Grape: "Fruit",
  Guava: "Fruit",
  Jujube: "Fruit",
  Mango: "Fruit",
  Orange: "Fruit",
  Pomegranate: "Fruit",
  Potato: "Vegetable",
  Strawberry: "Fruit",
  Tomato: "Vegetable"
};

const foodCategory =
  foodCategories[result.food] || "Other";


// ==========================================
// SAVE AI RESULT TO INVENTORY
// ==========================================

const existingInventory = JSON.parse(
  localStorage.getItem("foodfresh_inventory") || "[]"
);

const inventoryItem = {
  id: Date.now(),
  emoji: resultEmoji,
  name: result.food,
  category: foodCategory,
  quantity: 1,
  unit: "kg",
  freshness: result.classification,
  score: Number(result.freshness_score),
  freshnessScore: Number(result.freshness_score),
  confidence: Number(result.confidence),
  shelfLife: result.shelf_life,
    // Calculate expiry date from remaining shelf life
  expiryDate: (() => {
    const match = String(result.shelf_life || "").match(/\d+(\.\d+)?/);
    const days = match ? Math.ceil(Number(match[0])) : 0;

    if (days <= 0) return null;

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);

    return expiry.toLocaleDateString("en-IN");
  })(),
  batch: resultBatch,
  lastAnalyzed: "Just now",
  storageTemperature: Number(temperature),
  humidity: Number(humidity),
  storageDuration: Number(storageDuration),
  airCirculation,
  lightExposure,
  packaging
};

localStorage.setItem(
  "foodfresh_inventory",
  JSON.stringify([
    inventoryItem,
    ...existingInventory
  ])
);
loadDashboardStats();
loadFreshnessTrend();
loadDashboardRecommendations();

// ==========================================
// SAVE AI RESULT TO FOOD BATCHES
// ==========================================

const existingBatches = JSON.parse(
  localStorage.getItem("foodfresh_batches") || "[]"
);

const batchItem = {
  id: Date.now() + 1,
  batchId: resultBatch,
  food: result.food,
  emoji: resultEmoji,
  category: foodCategory,
  quantity: "1 kg",
  freshness: result.classification,
  score: Number(result.freshness_score),
  shelfLife: result.shelf_life,
  added: "Just now",

  status:
    result.classification === "Spoiled"
      ? "Expired"
      : result.classification === "Near Spoilage"
      ? "Priority"
      : "Active",

  storageTemperature: Number(temperature),
  humidity: Number(humidity)
};

localStorage.setItem(
  "foodfresh_batches",
  JSON.stringify([
    batchItem,
    ...existingBatches
  ])
);

} catch (error) {
    console.error("Analysis error:", error);

    alert(
      error.message ||
      "Unable to analyze image. Please make sure the backend is running."
    );

  } finally {
    setAnalyzing(false);
  }
};

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = () => {

    localStorage.removeItem("foodfresh_logged_in");

    localStorage.removeItem("foodfresh_user");

    localStorage.removeItem("foodfresh_access_token");

    window.location.href = "/login";

  };
  // =========================
  // SIDEBAR
  // =========================

  const Sidebar = () => (
    <aside className="sidebar">

      <div className="logo">
        <div className="logo-icon">F</div>

        <div>
          <h2>FoodFresh</h2>
          <span>AI PLATFORM</span>
        </div>
      </div>

      <div className="menu-title">
        MAIN MENU
      </div>

      <nav>
        {menuItems.map((item) => (
          <button
            key={item.name}
            className={`menu-item ${
              activePage === item.name
                ? "active"
                : ""
            }`}
            onClick={() => {
              setActivePage(item.name);
            }}
          >
            <span className="menu-icon">
              {item.icon}
            </span>

            <span>{item.name}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">

        <div className="system-status">
          <span className="status-dot"></span>

          <div>
            <strong>System Status</strong>

            <small>
              All systems operational
            </small>
          </div>
        </div>

        <div className="user-box">

          <div className="avatar">
            {(currentUser.name || "U").charAt(0).toUpperCase()}
          </div>

          <div>
            <strong>{currentUser.name || "User"}</strong>

            <small>
              {isAdmin ? "Administrator" : "User / Staff"}
            </small>
          </div>

          <div className="profile-menu-container">
            <button
              type="button"
              className="profile-menu-dots"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              title="Profile menu"
            >
              ⋮
            </button>

            {showProfileMenu && (
              <div className="profile-dropdown">
                <button
                  type="button"
                  className="signout-button"
                  onClick={handleLogout}
                >
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

    </aside>
  );

  // =========================
  // TOP BAR
  // =========================

  const TopBar = () => (
    <header className="topbar">

      <div className="search-box">

        <span>⌕</span>

        <input
          type="text"
          placeholder="Search analytics, batches, or reports..."
        />

      </div>

      <div className="top-actions">
        <button
          className="notification"
          onClick={() => setActivePage("Alerts")}
          title="View Alerts"
        >
          🔔

          {alertCount > 0 && (
            <span className="notification-badge">
              {alertCount > 99 ? "99+" : alertCount}
            </span>
          )}
        </button>

        <button
  type="button"
  className="help-button"
  onClick={() => alert(
    "FoodFresh Help\n\n" +
    "• Upload a food image from Analyze Food.\n" +
    "• Review freshness score and shelf life.\n" +
    "• Check Alerts for spoilage warnings.\n" +
    "• Use Inventory to track food items and batches.\n" +
    "• Use Reports to export PDF or Excel reports."
  )}
  title="Help"
>
  ?
</button>

          <div className="profile profile-clickable">

  <div className="avatar small">
    {(currentUser.name || "U").charAt(0).toUpperCase()}
  </div>

  <div>
    <strong>{currentUser.name || "User"}</strong>

    <small>
      {isAdmin ? "Admin" : "Staff"}
    </small>
  </div>

  <button
    type="button"
    className="profile-arrow"
    onClick={() => setShowProfileMenu((prev) => !prev)}
    aria-label="Open profile menu"
  >
    ⌄
  </button>

  {showProfileMenu && (
    <div className="profile-dropdown">
      <button
        type="button"
        onClick={handleLogout}
        className="profile-dropdown-item"
      >
        🚪 Sign Out
      </button>
    </div>
  )}

</div>

          

        </div>

    </header>
  );

  // =========================
  // MAIN DASHBOARD
  // =========================

  return (
    <div className="app">

      <Sidebar />

      <main className="main">

        <TopBar />

        <section className="content">

          {/* ==================================================
              DASHBOARD
          ================================================== */}

          {activePage === "Dashboard" && (
            <>

              <div className="page-heading">

                <div>

                  <h1>
                    Food Freshness Dashboard
                  </h1>

                  <p>
                    Track food quality, freshness
                    and shelf-life predictions.
                  </p>

                </div>

                <select
  className="date-filter"
  value={dashboardPeriod}
  onChange={(e) =>
    setDashboardPeriod(Number(e.target.value))
  }
>
  <option value={7}>Last 7 days</option>
  <option value={30}>Last 30 days</option>
</select>

              </div>
{/* STAT CARDS */}

<div className="stats-grid">

  <div className="stat-card">

    <div className="stat-top">
      <span>Total Food Items</span>

      <div className="stat-icon">
        ▦
      </div>
    </div>

    <h2>
      {dashboardStats.total}
    </h2>

    <div className="stat-change positive">
      Based on analyzed food
    </div>

  </div>


  <div className="stat-card">

    <div className="stat-top">
      <span>Fresh Items</span>

      <div className="stat-icon fresh">
        ✓
      </div>
    </div>

    <h2 className="fresh-text">
      {dashboardStats.fresh}
    </h2>

    <div className="stat-change positive">
      {dashboardStats.total > 0
        ? `${Math.round(
            (dashboardStats.fresh / dashboardStats.total) * 100
          )}%`
        : "0%"}
      <span>
        of analyzed food
      </span>
    </div>

  </div>


  <div className="stat-card warning-card">

    <div className="stat-top">
      <span>Near Spoilage</span>

      <div className="stat-icon warning">
        !
      </div>
    </div>

    <h2 className="warning-text">
      {dashboardStats.nearSpoilage}
    </h2>

    <div className="stat-change warning-change">
      Requires priority action
    </div>

  </div>


  <div className="stat-card">

    <div className="stat-top">
      <span>Spoiled Items</span>

      <div className="stat-icon danger">
        ×
      </div>
    </div>

    <h2 className="danger-text">
      {dashboardStats.spoiled}
    </h2>

    <div className="stat-change danger-change">
      {dashboardStats.total > 0
        ? `${Math.round(
            (dashboardStats.spoiled / dashboardStats.total) * 100
          )}%`
        : "0%"}
      <span>
        of analyzed food
      </span>
    </div>

  </div>


  <div className="stat-card score-card">

    <div className="stat-top">
      <span>Avg. Freshness</span>

      <div className="score-icon">
        ◉
      </div>
    </div>

    <h2>
      {dashboardStats.averageScore}
      <span>/100</span>
    </h2>

    <div className="progress">
      <div
        className="progress-fill"
        style={{
          width: `${dashboardStats.averageScore}%`
        }}
      ></div>
    </div>

    <small>
      {dashboardStats.averageScore >= 90
        ? "Excellent overall quality"
        : dashboardStats.averageScore >= 75
        ? "Good overall quality"
        : dashboardStats.averageScore >= 60
        ? "Acceptable overall quality"
        : dashboardStats.averageScore >= 40
        ? "Near spoilage risk"
        : "Poor overall quality"}
    </small>

  </div>

</div>


              {/* CHARTS */}

              <div className="charts-grid">

                <div className="panel">

                  <div className="panel-header">

                    <div>

                      <h3>
                        Freshness Distribution
                      </h3>

                      <p>
                        Current inventory quality
                      </p>

                    </div>

                    <button
  type="button"
  onClick={loadDashboardStats}
  title="Refresh distribution"
>
  ↻
</button>

                  </div>

                  <div className="distribution">

                    <div className="donut">

                      <div className="donut-center">

<strong>
  {dashboardStats.total > 0
    ? Math.round(
        ((dashboardStats.fresh +
          dashboardStats.good) /
          dashboardStats.total) *
          100
      )
    : 0}%
</strong>

                        <span>
                          OPTIMAL
                        </span>

                      </div>

                    </div>

                    <div className="legend">

                      <div>
                        <span className="legend-dot fresh-dot"></span>
                        Fresh
                        <strong>
  {getDistributionPercentage(dashboardStats.fresh)}%
</strong>
                      </div>

                      <div>
                        <span className="legend-dot good-dot"></span>
                        Good
                        <strong>
  {getDistributionPercentage(dashboardStats.good)}%
</strong>
                      </div>

                      <div>
                        <span className="legend-dot acceptable-dot"></span>
                        Acceptable
                        <strong>
  {getDistributionPercentage(dashboardStats.acceptable)}%
</strong>
                      </div>
                      <div>
  <span className="legend-dot warning-dot"></span>
  Near Spoilage
  <strong>
    {getDistributionPercentage(
      dashboardStats.nearSpoilage
    )}%
  </strong>
</div>

                      <div>
                        <span className="legend-dot spoiled-dot"></span>
                        Spoiled
                        <strong>
  {getDistributionPercentage(dashboardStats.spoiled)}%
</strong>
                      </div>

                    </div>

                  </div>

                </div>

                <div className="panel">

                  <div className="panel-header">

                    <div>

                      <h3>
                        Freshness Trend
                      </h3>

                      <p>
                        Average score over time
                      </p>

                    </div>

                    <select
                      value={trendPeriod}
                      onChange={(e) =>
                        setTrendPeriod(Number(e.target.value))
                      }
                    >
                      <option value={7}>Last 7 days</option>
                      <option value={30}>Last 30 days</option>
                    </select>

                  </div>

<div className="bar-chart">
  {freshnessTrend.length > 0 ? (
    freshnessTrend.map((score, index) => (
      <div
        key={index}
        className={`bar ${
          score !== null && index === freshnessTrend.length - 1
            ? "active-bar"
            : ""
        } ${score === null ? "empty-bar" : ""}`}
        style={{
          height:
            score !== null
              ? `${Math.max(5, score)}%`
              : "5%",
        }}
      >
        {score !== null && (
          <span>{Math.round(score)}</span>
        )}
      </div>
    ))
  ) : (
    <div className="no-data">
      No analysis data yet
    </div>
  )}
</div>
<div className="chart-labels">
  {trendDates.length > 0 ? (
    trendDates.map((date, index) => (
      <span key={index}>
        {date}
      </span>
    ))
  ) : (
    <span>No data</span>
  )}
</div>
                

                </div>

              </div>

              {/* ANALYSIS + RECOMMENDATIONS */}

              <div className="lower-grid">

                <div className="panel analysis-panel">

                  <div className="panel-header">

                    <div>

                      <h3>
                        Analyze Food Freshness
                      </h3>

                      <p>
                        Upload a food image to
                        estimate freshness and
                        remaining shelf life.
                      </p>

                    </div>

                    <span className="model-badge">
                      AI MODEL v1.0
                    </span>

                  </div>

                  <div className="analysis-content">

                    <div className="upload-area">

                      {!preview ? (

                        <>

                          <div className="upload-icon">
                            ↑
                          </div>

                          <h4>
                            Upload Food Sample
                          </h4>

                          <p>
                            Drag and drop an image
                            here or browse from your
                            device.
                          </p>

                          <label className="browse-button">

                            Browse Image

                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              hidden
                            />

                          </label>

                        </>

                      ) : (

                        <>

                          <img
                            src={preview}
                            alt="Selected food"
                            className="food-preview-small"
                          />

                          <p className="selected-name">
                            {selectedFile?.name}
                          </p>

                          <div className="analysis-buttons">

                            <label className="change-image-button">

                              🔄 Change Image

                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                hidden
                              />

                            </label>

                            <button
                              className="analyze-button"
                              onClick={handleAnalyze}
                              disabled={analyzing}
                            >

                              {analyzing
                                ? "⏳ Analyzing..."
                                : "🔍 Analyze Freshness"}

                            </button>

                          </div>

                        </>

                      )}

                    </div>

                    <AnalysisResult
                      analysisResult={analysisResult}
                    />

                  </div>

                </div>

                {/* RECOMMENDATIONS */}

                <div className="panel recommendation-panel">

                  <div className="panel-header">

                    <div>

                      <h3>
                        AI Recommendations
                      </h3>

                      <p>
                        Smart actions to reduce
                        food waste
                      </p>

                    </div>

                    <span className="ai-star">
                      ✦
                    </span>

                  </div>

                      

                  {dashboardRecommendations.length > 0 ? (
  dashboardRecommendations.map((rec, index) => (
    <div className="recommendation" key={rec.id || index}>
      
      <span
        className={`priority ${
          rec.priority === "Critical" || rec.priority === "High"
            ? ""
            : "logistics"
        }`}
      >
        {rec.priority?.toUpperCase() || "INFO"}
      </span>

      <h4>{rec.title}</h4>

      <p>{rec.message}</p>

    </div>
  ))
) : (
  <div className="recommendation">

    <h4>No recommendations yet</h4>

    <p>
      Analyze food items to receive AI-powered
      storage and freshness recommendations.
    </p>

  </div>
)}

<div className="waste-box">
  {(() => {
    const history = dashboardHistory;
    const nearSpoilage = history.filter(
  (item) =>
    item.classification === "Near Spoilage" ||
    Number(item.score) < 60
).length;

const spoiled = history.filter(
  (item) =>
    item.classification === "Spoiled" ||
    Number(item.score) < 40
).length;

const wastePrevented = Math.max(
  0,
  (nearSpoilage - spoiled) * 2
);

    return (
      <>
        <strong>
          ♻ Waste Prevented: {wastePrevented} kg
        </strong>

        <p>
          Your monitoring system has helped
          identify {nearSpoilage} item
          {nearSpoilage !== 1 ? "s" : ""} approaching
          spoilage, enabling timely action and
          reducing potential food waste.
        </p>
      </>
    );
  })()}
</div>

                </div>

              </div>

              {/* RECENT ANALYSIS */}

              <div className="panel recent-panel">

                <div className="panel-header">

                  <div>

                    <h3>
                      Recent Food Analysis
                    </h3>

                    <p>
                      Latest freshness assessments
                    </p>

                  </div>

                  <button
                    className="view-all"
                    onClick={() =>
                      setActivePage("Freshness History")
                    }
                  >
                    View All →
                  </button>

                </div>

                <div className="table-wrapper">

                  <table>

                    <thead>

                      <tr>

                        <th>Food Item</th>
                        <th>Category</th>
                        <th>Freshness</th>
                        <th>Score</th>
                        <th>Shelf Life</th>
                        <th>Analyzed</th>

                      </tr>

                    </thead>

              <tbody>
  {(() => {
    const recentHistory = dashboardHistory.slice(0, 5);

    const foodCategories = {
      Apple: "Fruit",
      Banana: "Fruit",
      Bellpepper: "Vegetable",
      Carrot: "Vegetable",
      Cucumber: "Vegetable",
      Grape: "Fruit",
      Guava: "Fruit",
      Jujube: "Fruit",
      Mango: "Fruit",
      Orange: "Fruit",
      Pomegranate: "Fruit",
      Potato: "Vegetable",
      Strawberry: "Fruit",
      Tomato: "Vegetable"
    };

    if (recentHistory.length === 0) {
      return (
        <tr>
          <td colSpan="6" style={{ textAlign: "center" }}>
            No food analysis available yet
          </td>
        </tr>
      );
    }

    return recentHistory.map((item, index) => {
      const freshness =
        item.classification ||
        item.freshness ||
        "Unknown";

      let badgeClass = "fresh-badge";

      if (
        freshness === "Near Spoilage" ||
        freshness === "Acceptable"
      ) {
        badgeClass = "warning-badge";
      }

      if (freshness === "Spoiled") {
        badgeClass = "danger-badge";
      }

      const food = item.food || "Unknown Food";

      const category =
        foodCategories[food] || "Food";

      const score =
        Number(item.freshness_score) || 0;

      const remainingDays =
        Number(item.remaining_days);

      const shelfLife =
        !isNaN(remainingDays)
          ? `${remainingDays} Days`
          : "N/A";

      const analyzedDate = item.created_at
        ? new Date(item.created_at).toLocaleDateString(
            "en-IN",
            {
              day: "2-digit",
              month: "short"
            }
          )
        : "Today";

      return (
        <tr key={item.id || index}>

          <td>
            {food}
          </td>

          <td>
            {category}
          </td>

          <td>
            <span
              className={`table-badge ${badgeClass}`}
            >
              {freshness}
            </span>
          </td>

          <td>
            {Math.round(score)}/100
          </td>

          <td>
            {shelfLife}
          </td>

          <td>
            {analyzedDate}
          </td>

        </tr>
      );
    });
  })()}
</tbody>     

                  </table>

                </div>

              </div>

            </>
          )}

          {/* ==================================================
              ANALYZE FOOD
          ================================================== */}

          {activePage === "Analyze Food" && (

            <div className="panel analysis-panel full-analysis-page">

              <div className="analysis-page-header">

                <div>

                  <h1>
                    Analyze Food
                  </h1>

                  <p>
                    Upload a food image for AI
                    freshness analysis.
                  </p>

                </div>

                <div className="analysis-header-actions">

                  <span className="model-badge">
                    AI MODEL v1.0
                  </span>

                  <button
                    className="back-dashboard-button"
                    onClick={handleBackToDashboard}
                  >
                    ← Back to Dashboard
                  </button>

                </div>

              </div>

              <div className="analysis-content">

                <div className="upload-area">

                  {!preview ? (

                    <>

                      <div className="upload-icon">
                        ↑
                      </div>

                      <h4>
                        Upload Food Sample
                      </h4>

                      <p>
                        Select an image from your device.
                      </p>

                      <label className="browse-button">

                        Browse Image

                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          hidden
                        />

                      </label>

                    </>

                  ) : (

                    <>

                      <img
                        src={preview}
                        alt="Selected food"
                        className="food-preview-small"
                      />

                      <p className="selected-name">
                        {selectedFile?.name}
                      </p>
                      <div className="storage-inputs">

  <div className="storage-input-header">
    <h4>Storage & Product Information</h4>
    <span>Used for freshness scoring</span>
  </div>

  <div className="storage-grid">

    <div className="input-group">
      <label>Temperature (°C)</label>
      <input
        type="number"
        value={temperature}
        onChange={(e) => setTemperature(e.target.value)}
        min="-20"
        max="50"
        step="0.1"
      />
    </div>

    <div className="input-group">
      <label>Humidity (%)</label>
      <input
        type="number"
        value={humidity}
        onChange={(e) => setHumidity(e.target.value)}
        min="0"
        max="100"
      />
    </div>

    <div className="input-group">
      <label>Storage Duration (Days)</label>
      <input
        type="number"
        value={storageDuration}
        onChange={(e) => setStorageDuration(e.target.value)}
        min="0"
      />
    </div>

    <div className="input-group">
      <label>Product Age (Days)</label>
      <input
        type="number"
        value={productAgeDays}
        onChange={(e) => setProductAgeDays(e.target.value)}
        min="0"
      />
    </div>

    <div className="input-group">
      <label>Air Circulation</label>
      <select
        value={airCirculation}
        onChange={(e) => setAirCirculation(e.target.value)}
      >
        <option value="Good">Good</option>
        <option value="Moderate">Moderate</option>
        <option value="Poor">Poor</option>
      </select>
    </div>

    <div className="input-group">
      <label>Light Exposure</label>
      <select
        value={lightExposure}
        onChange={(e) => setLightExposure(e.target.value)}
      >
        <option value="Low">Low</option>
        <option value="Medium">Medium</option>
        <option value="High">High</option>
      </select>
    </div>

    <div className="input-group">
      <label>Packaging</label>
      <select
        value={packaging}
        onChange={(e) => setPackaging(e.target.value)}
      >
        <option value="Proper">Proper</option>
        <option value="Damaged">Damaged</option>
        <option value="Open">Open</option>
        <option value="None">None</option>
      </select>
    </div>

  </div>

</div>
                      <div className="analysis-buttons">

                        <label className="change-image-button">

                          🔄 Change Image

                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            hidden
                          />

                        </label>

                        <button
                          className="analyze-button"
                          onClick={handleAnalyze}
                          disabled={analyzing}
                        >

                          {analyzing
                            ? "⏳ Analyzing..."
                            : "🔍 Analyze Freshness"}

                        </button>

                      </div>

                    </>

                  )}

                </div>

                <AnalysisResult
                  analysisResult={analysisResult}
                  showNewAnalysis={true}
                  onNewAnalysis={handleNewAnalysis}
                />

              </div>

            </div>

          )}

          {/* ==================================================
              INVENTORY
          ================================================== */}
          {activePage === "Inventory" && <Inventory />}

          {/* ==================================================
              FOOD BATCHES
          ================================================== */}
          {activePage === "Food Batches" && <FoodBatches />}

          {/* ==================================================
              FRESHNESS HISTORY
          ================================================== */}
          {activePage === "Freshness History" && <FreshnessHistory />}

          {/* ==================================================
              RECOMMENDATIONS
          ================================================== */}
          {activePage === "Recommendations" && <Recommendations />}

          {/* ==================================================
              ALERTS
          ================================================== */}
          {activePage === "Alerts" && <Alerts />}

          {/* ==================================================
              REPORTS
          ================================================== */}
          {activePage === "Reports" && <Reports />}

          {/* ==================================================
              SETTINGS
          ================================================== */}
          {activePage === "Settings" && isAdmin && <Settings />}
          {activePage === "Storage Monitoring" && <StorageMonitoring />}

        </section>

      </main>

    </div>
  );
}

// ============================================================
// ANALYSIS RESULT COMPONENT
// ============================================================

function AnalysisResult({
  analysisResult,
  showNewAnalysis = false,
  onNewAnalysis,
}) {
  return (
    <div className="result-card">

      {analysisResult ? (

        <>

          {/* RESULT HEADER */}
          <div className="result-top">

            <span className="fresh-badge">
              ●{" "}
              {analysisResult.freshness?.toUpperCase()}
            </span>

            <span>
              {analysisResult.confidence}% confidence
            </span>

          </div>


          {/* FOOD NAME */}
          <h2>
            {analysisResult.food}
          </h2>


          {/* MAIN RESULT INFORMATION */}
          <div className="result-info">

            <div>
              <span>FRESHNESS SCORE</span>

              <strong className="fresh-text">
                {analysisResult.freshness_score}/100
              </strong>
            </div>


            <div>
              <span>CLASSIFICATION</span>

              <strong>
                {analysisResult.classification}
              </strong>
            </div>


            <div>
              <span>REMAINING SHELF LIFE</span>

              <strong>
                {analysisResult.shelf_life}
              </strong>
            </div>

          </div>


          {/* FRESHNESS SCORE BAR */}
          <div className="result-bar">

            <div
              style={{
                width: `${analysisResult.freshness_score}%`,
              }}
            ></div>

          </div>

          {/* VISUAL CONDITION ANALYSIS */}
          {analysisResult.visual_analysis && (
            <div className="visual-analysis-results">

              <h4>
                Visual Condition Analysis
              </h4>

              <div className="visual-analysis-grid">

                <div>
                  <span>Visual Condition Score</span>
                  <strong>
                    {analysisResult.visual_analysis.visual_condition_score}/100
                  </strong>
                </div>


                <div>
                  <span>Color</span>
                  <strong>
                    {analysisResult.visual_analysis.color_analysis?.condition}
                  </strong>
                </div>


                <div>
                  <span>Texture</span>
                  <strong>
                    {analysisResult.visual_analysis.texture_analysis?.condition}
                  </strong>
                </div>


                <div>
                  <span>Mold Detection</span>
                  <strong>
                    {analysisResult.visual_analysis.mold_detection?.status}
                  </strong>
                </div>


                <div>
                  <span>Bruising</span>
                  <strong>
                    {analysisResult.visual_analysis.bruising_detection?.status}
                  </strong>
                </div>


                <div>
                  <span>Physical Damage</span>
                  <strong>
                    {analysisResult.visual_analysis.physical_damage_detection?.status}
                  </strong>
                </div>

              </div>

            </div>
          )}


          {/* SHELF LIFE DETAILS */}
          <div className="analysis-details">

            <div>
              <span>Expected Shelf Life</span>

              <strong>
                {analysisResult.expected_shelf_life_days} Days
              </strong>
            </div>


            <div>
              <span>Remaining Shelf Life</span>

              <strong>
                {analysisResult.remaining_days} Days
              </strong>
            </div>

          </div>


          {/* STORAGE CONDITIONS */}
          <div className="storage-results">

            <h4>
              Storage Conditions
            </h4>


            <div className="storage-results-grid">

              <div>
                <span>Temperature</span>

                <strong>
                  {analysisResult.storage?.temperature}°C
                </strong>
              </div>


              <div>
                <span>Humidity</span>

                <strong>
                  {analysisResult.storage?.humidity}%
                </strong>
              </div>


              <div>
                <span>Air Circulation</span>

                <strong>
                  {analysisResult.storage?.air_circulation}
                </strong>
              </div>


              <div>
                <span>Light Exposure</span>

                <strong>
                  {analysisResult.storage?.light_exposure}
                </strong>
              </div>


              <div>
                <span>Packaging</span>

                <strong>
                  {analysisResult.storage?.packaging}
                </strong>
              </div>


              <div>
                <span>Storage Duration</span>

                <strong>
                  {analysisResult.storage?.storage_duration} Days
                </strong>
              </div>

            </div>


            {/* STORAGE WARNING */}
            {analysisResult.storage_warning && (
              <div className="storage-warning">
                ⚠️ {analysisResult.storage_warning}
              </div>
            )}

          </div>


          {/* AI RECOMMENDATION */}
          <small className="analysis-recommendation">
            {analysisResult.recommendation}
          </small>


          {/* NEW ANALYSIS BUTTON */}
          {showNewAnalysis && (

            <button
              className="new-analysis-button"
              onClick={onNewAnalysis}
            >
              + Analyze Another Image
            </button>

          )}

        </>

      ) : (

        <>

          {/* EMPTY RESULT STATE */}
          <div className="result-top">

            <span className="fresh-badge">
              ● READY
            </span>

            <span>
              Waiting for analysis
            </span>

          </div>


          <h2>
            Food Analysis
          </h2>


          <small>
            Upload an image and click
            Analyze Freshness.
          </small>

        </>

      )}

    </div>
  );
}


// ============================================================
// ROUTING
// ============================================================

function App() {

  return (

    <Routes>

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      <Route
        path="/dashboard"
        element={<ProtectedDashboard />}
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

    </Routes>

  );
}

export default App;