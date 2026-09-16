import { useEffect, useState } from "react";

function RetailDashboard() {
  const [foodItems, setFoodItems] = useState([]);
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const token = localStorage.getItem("access_token");

        // Get inventory
        const response = await fetch(
          "http://127.0.0.1:8000/food/",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setFoodItems(data);
        }

        // Get latest freshness prediction
        const savedPrediction =
          localStorage.getItem("latest_prediction");

        if (savedPrediction) {
          setPrediction(JSON.parse(savedPrediction));
        }
      } catch (error) {
        console.error(
          "Failed to load retail dashboard data:",
          error
        );
      }
    };

    loadDashboardData();
  }, []);

  // =========================
  // INVENTORY ANALYSIS
  // =========================

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiredItems = foodItems.filter((item) => {
    if (!item.expiry_date) return false;

    const expiry = new Date(item.expiry_date);
    expiry.setHours(0, 0, 0, 0);

    return expiry < today;
  });

  const expiringSoonItems = foodItems.filter((item) => {
    if (!item.expiry_date) return false;

    const expiry = new Date(item.expiry_date);
    expiry.setHours(0, 0, 0, 0);

    const difference =
      (expiry - today) / (1000 * 60 * 60 * 24);

    return difference >= 0 && difference <= 7;
  });

  const totalQuantity = foodItems.reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0
  );

  // =========================
  // FRESHNESS INFORMATION
  // =========================

  const freshnessScore =
    prediction?.freshnessScore ?? null;

  let freshnessCategory = "No Recent Assessment";

  if (freshnessScore !== null) {
    if (freshnessScore >= 90) {
      freshnessCategory = "Fresh";
    } else if (freshnessScore >= 75) {
      freshnessCategory = "Good";
    } else if (freshnessScore >= 60) {
      freshnessCategory = "Acceptable";
    } else if (freshnessScore >= 40) {
      freshnessCategory = "Near Spoilage";
    } else {
      freshnessCategory = "Spoiled";
    }
  }

  // =========================
  // FRESHNESS STATUS CLASS
  // =========================

  const getFreshnessClass = () => {
    if (freshnessCategory === "Fresh") return "rm-status-fresh";
    if (freshnessCategory === "Good") return "rm-status-good";
    if (freshnessCategory === "Acceptable")
      return "rm-status-acceptable";
    if (freshnessCategory === "Near Spoilage")
      return "rm-status-warning";

    if (freshnessCategory === "Spoiled")
      return "rm-status-spoiled";

    return "rm-status-neutral";
  };

  // =========================
  // SUGGESTED ACTION
  // =========================

  let suggestedAction =
    "Continue monitoring inventory freshness and shelf life.";

  if (expiredItems.length > 0) {
    suggestedAction =
      "Remove expired products and review inventory rotation practices.";
  } else if (expiringSoonItems.length > 0) {
    suggestedAction =
      "Prioritize products approaching expiry to reduce potential food waste.";
  } else if (prediction?.status === "Spoiled") {
    suggestedAction =
      "Remove the recently spoiled food and review its storage conditions.";
  }

  return (
    <div className="rm-dashboard">

      {/* =========================
          HEADER
      ========================= */}

      <div className="rm-header">
        <div>
          <div className="rm-header-label">
            RETAIL MANAGEMENT
          </div>

          <h1>Retail Manager Dashboard</h1>

          <p>
            Monitor inventory, freshness, shelf life and
            waste reduction.
          </p>
        </div>

        <div className="rm-header-date">
          <span>📅</span>
          <div>
            <strong>
              {today.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </strong>

            <small>Today's Overview</small>
          </div>
        </div>
      </div>

      {/* =========================
          KPI CARDS
      ========================= */}

      <div className="rm-stats-grid">

        <div className="rm-stat-card">
          <div className="rm-stat-top">
            <div className="rm-stat-icon">
              📦
            </div>

            <span className="rm-stat-label">
              INVENTORY
            </span>
          </div>

          <h2>{foodItems.length}</h2>

          <p>Total Products</p>
        </div>

        <div className="rm-stat-card">
          <div className="rm-stat-top">
            <div className="rm-stat-icon">
              📊
            </div>

            <span className="rm-stat-label">
              STOCK
            </span>
          </div>

          <h2>{totalQuantity}</h2>

          <p>Total Inventory Quantity</p>
        </div>

        <div className="rm-stat-card">
          <div className="rm-stat-top">
            <div className="rm-stat-icon rm-warning-icon">
              ⏳
            </div>

            <span className="rm-stat-label">
              ATTENTION
            </span>
          </div>

          <h2>{expiringSoonItems.length}</h2>

          <p>Products Expiring Soon</p>
        </div>

        <div className="rm-stat-card">
          <div className="rm-stat-top">
            <div className="rm-stat-icon rm-danger-icon">
              ⚠️
            </div>

            <span className="rm-stat-label">
              CRITICAL
            </span>
          </div>

          <h2>{expiredItems.length}</h2>

          <p>Expired Products</p>
        </div>

      </div>

      {/* =========================
          MAIN MANAGEMENT GRID
      ========================= */}

      <div className="rm-management-grid">

        {/* =========================
            FRESHNESS ANALYTICS
        ========================= */}

        <div className="rm-panel rm-freshness-panel">

          <div className="rm-panel-header">
            <div>
              <span className="rm-panel-icon">
                🍎
              </span>

              <div>
                <h2>Product Freshness Analytics</h2>
                <p>Latest AI freshness assessment</p>
              </div>
            </div>

            <span className="rm-panel-link">
              AI Analysis
            </span>
          </div>

          {prediction ? (
            <div className="rm-freshness-content">

              <div className="rm-food-result">

                <div className="rm-food-icon">
                  {prediction.foodEmoji || "🍎"}
                </div>

                <div>
                  <span>Analyzed Product</span>

                  <h3>
                    {prediction.foodType || "Food"}
                  </h3>
                </div>

              </div>

              <div className="rm-freshness-score-box">

                <div>
                  <span>Freshness Score</span>

                  <strong>
                    {freshnessScore}/100
                  </strong>
                </div>

                <div
                  className={`rm-freshness-status ${getFreshnessClass()}`}
                >
                  {freshnessCategory}
                </div>

              </div>

              <div className="rm-analysis-details">

                <div className="rm-detail-item">
                  <span>Food Status</span>

                  <strong
                    className={
                      prediction.status === "Spoiled"
                        ? "rm-status-spoiled"
                        : "rm-status-fresh"
                    }
                  >
                    {prediction.status}
                  </strong>
                </div>

                <div className="rm-detail-item">
                  <span>AI Confidence</span>

                  <strong>
                    {prediction.confidence || "N/A"}%
                  </strong>
                </div>

                <div className="rm-detail-item">
                  <span>Estimated Shelf Life</span>

                  <strong>
                    {prediction.shelfLife || "N/A"}
                  </strong>
                </div>

              </div>

            </div>
          ) : (
            <div className="rm-empty-state">
              <div>🍎</div>

              <h3>No Recent Assessment</h3>

              <p>
                Analyze a food image from the Dashboard
                to view freshness information.
              </p>
            </div>
          )}

        </div>

        {/* =========================
            SHELF LIFE ALERTS
        ========================= */}

        <div className="rm-panel">

          <div className="rm-panel-header">
            <div>
              <span className="rm-panel-icon">
                ⏳
              </span>

              <div>
                <h2>Shelf-Life Alerts</h2>
                <p>Products requiring attention</p>
              </div>
            </div>

            <span className="rm-alert-count">
              {expiredItems.length +
                expiringSoonItems.length}
            </span>
          </div>

          <div className="rm-alert-list">

            {expiredItems.length > 0 && (
              <div className="rm-alert-item rm-alert-critical">

                <div className="rm-alert-symbol">
                  🚨
                </div>

                <div>
                  <h3>Expired Products</h3>

                  <p>
                    {expiredItems.length} product
                    {expiredItems.length > 1
                      ? "s have"
                      : " has"}{" "}
                    passed the expiry date.
                  </p>
                </div>

              </div>
            )}

            {expiringSoonItems.length > 0 && (
              <div className="rm-alert-item rm-alert-warning">

                <div className="rm-alert-symbol">
                  ⚠️
                </div>

                <div>
                  <h3>Expiring Soon</h3>

                  <p>
                    {expiringSoonItems.length} product
                    {expiringSoonItems.length > 1
                      ? "s are"
                      : " is"}{" "}
                    approaching expiry within 7 days.
                  </p>
                </div>

              </div>
            )}

            {expiredItems.length === 0 &&
              expiringSoonItems.length === 0 && (
                <div className="rm-alert-item rm-alert-safe">

                  <div className="rm-alert-symbol">
                    ✅
                  </div>

                  <div>
                    <h3>No Shelf-Life Alerts</h3>

                    <p>
                      No products currently require
                      expiry-related attention.
                    </p>
                  </div>

                </div>
              )}

          </div>

        </div>

      </div>

      {/* =========================
          INVENTORY QUALITY
      ========================= */}

      <div className="rm-panel rm-inventory-panel">

        <div className="rm-panel-header">
          <div>
            <span className="rm-panel-icon">
              📦
            </span>

            <div>
              <h2>Inventory Quality Monitoring</h2>
              <p>
                Current inventory and expiry overview
              </p>
            </div>
          </div>

          <span className="rm-panel-link">
            {foodItems.length} Products
          </span>
        </div>

        {foodItems.length === 0 ? (
          <div className="rm-empty-state">
            <div>📦</div>

            <h3>No Inventory Available</h3>

            <p>
              Add products to inventory to monitor
              their quality.
            </p>
          </div>
        ) : (
          <div className="rm-table-wrapper">

            <table className="rm-inventory-table">

              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Batch</th>
                  <th>Expiry Date</th>
                  <th>Inventory Status</th>
                </tr>
              </thead>

              <tbody>
                {foodItems
                  .slice(0, 6)
                  .map((item) => {

                    const expiryDate =
                      item.expiry_date
                        ? new Date(item.expiry_date)
                        : null;

                    let inventoryStatus = "Active";
                    let statusClass =
                      "rm-status-fresh";

                    if (
                      expiryDate &&
                      expiryDate < today
                    ) {
                      inventoryStatus = "Expired";
                      statusClass =
                        "rm-status-spoiled";
                    } else if (
                      expiryDate &&
                      (expiryDate - today) /
                        (1000 * 60 * 60 * 24) <= 7
                    ) {
                      inventoryStatus = "Expiring Soon";
                      statusClass =
                        "rm-status-warning";
                    }

                    return (
                      <tr key={item.food_id}>

                        <td>
                          <strong>
                            {item.food_name}
                          </strong>
                        </td>

                        <td>
                          {item.category || "—"}
                        </td>

                        <td>
                          {item.quantity ?? "—"}
                        </td>

                        <td>
                          {item.batch_number || "—"}
                        </td>

                        <td>
                          {item.expiry_date || "—"}
                        </td>

                        <td>
                          <span
                            className={`rm-table-status ${statusClass}`}
                          >
                            {inventoryStatus}
                          </span>
                        </td>

                      </tr>
                    );
                  })}
              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* =========================
          WASTE + ACTIONS
      ========================= */}

      <div className="rm-bottom-grid">

        {/* WASTE INSIGHTS */}

        <div className="rm-panel">

          <div className="rm-panel-header">
            <div>
              <span className="rm-panel-icon">
                ♻️
              </span>

              <div>
                <h2>Waste Reduction Insights</h2>
                <p>Inventory waste risk</p>
              </div>
            </div>
          </div>

          <div className="rm-waste-metrics">

            <div className="rm-waste-metric">
              <span>🚨</span>

              <div>
                <strong>
                  {expiredItems.length}
                </strong>

                <p>Expired Products</p>
              </div>
            </div>

            <div className="rm-waste-metric">
              <span>🔄</span>

              <div>
                <strong>
                  {expiringSoonItems.length}
                </strong>

                <p>Products to Rotate</p>
              </div>
            </div>

            <div className="rm-waste-metric">
              <span>⚠️</span>

              <div>
                <strong>
                  {prediction?.status === "Spoiled"
                    ? 1
                    : 0}
                </strong>

                <p>Recently Spoiled</p>
              </div>
            </div>

          </div>

        </div>

        {/* RECOMMENDED ACTION */}

        <div className="rm-panel rm-action-panel">

          <div className="rm-panel-header">
            <div>
              <span className="rm-panel-icon">
                💡
              </span>

              <div>
                <h2>Recommended Action</h2>
                <p>Management priority</p>
              </div>
            </div>
          </div>

          <div className="rm-action-content">

            <div className="rm-action-icon">
              💡
            </div>

            <p>
              {suggestedAction}
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

export default RetailDashboard;