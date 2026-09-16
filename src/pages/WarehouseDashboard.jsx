import { useEffect, useState } from "react";

function WarehouseDashboard() {
  const [foodItems, setFoodItems] = useState([]);
  const [temperature, setTemperature] = useState(null);
  const [humidity, setHumidity] = useState(null);
  const [storageScore, setStorageScore] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadWarehouseData = async () => {
      try {
        const token = localStorage.getItem("access_token");

        const response = await fetch(
          "http://127.0.0.1:8000/food/",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load inventory data.");
        }

        const data = await response.json();
        setFoodItems(data);

        const savedTemperature =
          localStorage.getItem("latest_temperature");

        const savedHumidity =
          localStorage.getItem("latest_humidity");

        const savedStorageScore =
          localStorage.getItem("storage_score");

        const savedPrediction =
          localStorage.getItem("latest_prediction");

        if (savedTemperature) {
          setTemperature(Number(savedTemperature));
        }

        if (savedHumidity) {
          setHumidity(Number(savedHumidity));
        }

        if (savedStorageScore) {
          setStorageScore(Number(savedStorageScore));
        }

        if (savedPrediction) {
          setPrediction(JSON.parse(savedPrediction));
        }
      } catch (err) {
        console.error(
          "Warehouse dashboard error:",
          err
        );

        setError(err.message);
      }
    };

    loadWarehouseData();
  }, []);

  // =====================================================
  // DATE CALCULATIONS
  // =====================================================

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysRemaining = (item) => {
    if (!item.expiry_date) {
      return null;
    }

    const expiry = new Date(item.expiry_date);
    expiry.setHours(0, 0, 0, 0);

    return Math.ceil(
      (expiry - today) /
        (1000 * 60 * 60 * 24)
    );
  };

  // =====================================================
  // INVENTORY ANALYTICS
  // =====================================================

  const totalProducts = foodItems.length;

  const totalQuantity = foodItems.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0
  );

  const expiredItems = foodItems.filter((item) => {
    const days = getDaysRemaining(item);

    return days !== null && days < 0;
  });

  const nearExpiryItems = foodItems.filter((item) => {
    const days = getDaysRemaining(item);

    return (
      days !== null &&
      days >= 0 &&
      days <= 7
    );
  });

  const activeItems = foodItems.filter((item) => {
    const days = getDaysRemaining(item);

    return days === null || days > 7;
  });

  const expiredQuantity = expiredItems.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0
  );

  const nearExpiryQuantity =
    nearExpiryItems.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0),
      0
    );

  // =====================================================
  // STORAGE STATUS
  // =====================================================

  let storageStatus = "Not Recorded";
  let storageMessage =
    "Storage conditions have not been recorded yet.";

  if (storageScore !== null) {
    if (storageScore >= 90) {
      storageStatus = "Good";
      storageMessage =
        "Storage conditions are within the recommended range.";
    } else if (storageScore >= 70) {
      storageStatus = "Warning";
      storageMessage =
        "Storage conditions need attention to maintain food quality.";
    } else {
      storageStatus = "Critical";
      storageMessage =
        "Storage conditions require immediate attention.";
    }
  }

  // =====================================================
  // STORAGE RECOMMENDATION
  // =====================================================

  let storageRecommendation =
    "Continue monitoring temperature and humidity regularly.";

  if (storageScore !== null) {
    if (storageScore >= 90) {
      storageRecommendation =
        "Maintain the current storage conditions and continue regular monitoring.";
    } else if (storageScore >= 70) {
      storageRecommendation =
        "Check temperature and humidity and adjust storage conditions if required.";
    } else {
      storageRecommendation =
        "Immediately inspect the storage environment and take corrective action.";
    }
  }

  // =====================================================
  // ALERT COUNT
  // =====================================================

  const storageAlert =
    storageScore !== null &&
    storageScore < 70;

  const totalAlerts =
    expiredItems.length +
    nearExpiryItems.length +
    (storageAlert ? 1 : 0);

  return (
    <div className="warehouse-dashboard">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="warehouse-dashboard-header">
        <div>
          <span className="warehouse-header-label">
            WAREHOUSE MANAGEMENT
          </span>

          <h1>
            Warehouse Operator Dashboard
          </h1>

          <p>
            Monitor storage conditions, inventory
            quality, freshness and shelf-life
            to maintain food quality and reduce waste.
          </p>
        </div>

        <div className="warehouse-header-icon">
          📦
        </div>
      </div>

      {error && (
        <div className="warehouse-error">
          ⚠️ {error}
        </div>
      )}

      {/* =================================================
          KEY METRICS
      ================================================= */}

      <div className="warehouse-kpi-grid">

        <div className="warehouse-kpi-card">
          <div className="warehouse-kpi-icon">
            📦
          </div>

          <div>
            <span>Total Inventory</span>
            <strong>{totalProducts}</strong>
            <small>Products monitored</small>
          </div>
        </div>

        <div className="warehouse-kpi-card">
          <div className="warehouse-kpi-icon">
            📊
          </div>

          <div>
            <span>Total Quantity</span>
            <strong>{totalQuantity}</strong>
            <small>Units in inventory</small>
          </div>
        </div>

        <div className="warehouse-kpi-card">
          <div className="warehouse-kpi-icon">
            ⏳
          </div>

          <div>
            <span>Near Expiry</span>
            <strong>{nearExpiryItems.length}</strong>
            <small>Within 7 days</small>
          </div>
        </div>

        <div className="warehouse-kpi-card">
          <div className="warehouse-kpi-icon">
            🚨
          </div>

          <div>
            <span>Alerts</span>
            <strong>{totalAlerts}</strong>
            <small>Require attention</small>
          </div>
        </div>

      </div>

      {/* =================================================
          STORAGE MONITORING
      ================================================= */}

      <div className="warehouse-section">

        <div className="warehouse-section-header">
          <div>
            <span>STORAGE MONITORING</span>

            <h2>
              Environmental Conditions
            </h2>

            <p>
              Monitor temperature, humidity and
              storage compliance.
            </p>
          </div>

          <div className="warehouse-section-icon">
            🌡️
          </div>
        </div>

        <div className="warehouse-storage-grid">

          <div className="warehouse-storage-card">
            <span>Temperature</span>

            <strong>
              {temperature !== null
                ? `${temperature}°C`
                : "--"}
            </strong>

            <small>
              Current reading
            </small>
          </div>

          <div className="warehouse-storage-card">
            <span>Humidity</span>

            <strong>
              {humidity !== null
                ? `${humidity}%`
                : "--"}
            </strong>

            <small>
              Current reading
            </small>
          </div>

          <div className="warehouse-storage-card">
            <span>Storage Score</span>

            <strong>
              {storageScore !== null
                ? `${storageScore}/100`
                : "--"}
            </strong>

            <small>
              Compliance score
            </small>
          </div>

          <div className="warehouse-storage-card">
            <span>Storage Status</span>

            <strong className="warehouse-storage-status">
              {storageStatus}
            </strong>

            <small>
              Environmental condition
            </small>
          </div>

        </div>

        <div className="warehouse-recommendation">

          <div className="warehouse-recommendation-icon">
            💡
          </div>

          <div>
            <span>
              STORAGE OPTIMIZATION
            </span>

            <h3>
              Storage Recommendation
            </h3>

            <p>
              {storageRecommendation}
            </p>
          </div>

        </div>

      </div>

      {/* =================================================
          INVENTORY QUALITY
      ================================================= */}

      <div className="warehouse-section">

        <div className="warehouse-section-header">
          <div>
            <span>INVENTORY QUALITY</span>

            <h2>
              Inventory Health Overview
            </h2>

            <p>
              Track active, near-expiry and expired
              products.
            </p>
          </div>

          <div className="warehouse-section-icon">
            📦
          </div>
        </div>

        <div className="warehouse-health-grid">

          <div className="warehouse-health-card">
            <div className="warehouse-health-icon">
              ✅
            </div>

            <div>
              <span>Active Products</span>
              <strong>{activeItems.length}</strong>
              <small>
                More than 7 days remaining
              </small>
            </div>
          </div>

          <div className="warehouse-health-card">
            <div className="warehouse-health-icon">
              ⏳
            </div>

            <div>
              <span>Near Expiry</span>
              <strong>{nearExpiryItems.length}</strong>
              <small>
                Within the next 7 days
              </small>
            </div>
          </div>

          <div className="warehouse-health-card">
            <div className="warehouse-health-icon">
              🚨
            </div>

            <div>
              <span>Expired Products</span>
              <strong>{expiredItems.length}</strong>
              <small>
                Requires removal
              </small>
            </div>
          </div>

        </div>

      </div>

      {/* =================================================
          BATCH FRESHNESS
      ================================================= */}

      <div className="warehouse-section">

        <div className="warehouse-section-header">
          <div>
            <span>BATCH FRESHNESS</span>

            <h2>
              Latest Freshness Assessment
            </h2>

            <p>
              Review the latest AI-based freshness
              assessment for a food batch.
            </p>
          </div>

          <div className="warehouse-section-icon">
            🍎
          </div>
        </div>

        {prediction ? (

          <div className="warehouse-prediction">

            <div className="warehouse-prediction-title">
              <span className="warehouse-food-icon">
                {prediction.foodEmoji || "🍎"}
              </span>

              <div>
                <h3>
                  {prediction.foodType ||
                    "Food Product"}
                </h3>

                <span>
                  Latest AI freshness assessment
                </span>
              </div>
            </div>

            <div className="warehouse-prediction-grid">

              <div>
                <span>Freshness Status</span>
                <strong>
                  {prediction.status || "--"}
                </strong>
              </div>

              <div>
                <span>Freshness Score</span>
                <strong>
                  {prediction.freshnessScore !==
                  undefined
                    ? `${prediction.freshnessScore}/100`
                    : "--"}
                </strong>
              </div>

              <div>
                <span>AI Confidence</span>
                <strong>
                  {prediction.confidence || "--"}
                </strong>
              </div>

              <div>
                <span>Estimated Shelf Life</span>
                <strong>
                  {prediction.shelfLife || "--"}
                </strong>
              </div>

            </div>

          </div>

        ) : (

          <div className="warehouse-empty-state">
            <div>🍎</div>

            <h3>
              No Freshness Assessment Available
            </h3>

            <p>
              Analyze a food item to generate
              freshness and shelf-life information.
            </p>
          </div>

        )}

      </div>

      {/* =================================================
          PRIORITY INVENTORY
      ================================================= */}

      <div className="warehouse-section">

        <div className="warehouse-section-header">
          <div>
            <span>INVENTORY PRIORITY</span>

            <h2>
              Products Requiring Attention
            </h2>

            <p>
              Products approaching expiry or already
              expired should be prioritized.
            </p>
          </div>

          <div className="warehouse-section-icon">
            ⚠️
          </div>
        </div>

        {expiredItems.length === 0 &&
        nearExpiryItems.length === 0 ? (

          <div className="warehouse-empty-state">
            <div>✅</div>

            <h3>
              Inventory is in Good Condition
            </h3>

            <p>
              No products currently require
              expiry-related attention.
            </p>
          </div>

        ) : (

          <div className="warehouse-priority-list">

            {[...expiredItems, ...nearExpiryItems]
              .slice(0, 8)
              .map((item) => {

                const days =
                  getDaysRemaining(item);

                return (
                  <div
                    className="warehouse-priority-row"
                    key={item.food_id}
                  >

                    <div className="warehouse-product-info">

                      <div className="warehouse-product-icon">
                        🍎
                      </div>

                      <div>
                        <h3>
                          {item.food_name}
                        </h3>

                        <span>
                          {item.category ||
                            "Food Product"}
                          {" • "}
                          Batch:{" "}
                          {item.batch_number || "—"}
                        </span>
                      </div>

                    </div>

                    <div className="warehouse-product-quantity">
                      <span>Quantity</span>
                      <strong>
                        {item.quantity || 0}
                      </strong>
                    </div>

                    <div
                      className={
                        days < 0
                          ? "warehouse-expiry expired"
                          : "warehouse-expiry warning"
                      }
                    >
                      {days < 0
                        ? `${Math.abs(days)} days overdue`
                        : days === 0
                        ? "Expires today"
                        : `${days} days left`}
                    </div>

                  </div>
                );
              })}

          </div>

        )}

      </div>

      {/* =================================================
          WAREHOUSE ALERTS
      ================================================= */}

      <div className="warehouse-section">

        <div className="warehouse-section-header">
          <div>
            <span>ALERT MANAGEMENT</span>

            <h2>
              Warehouse Alerts
            </h2>

            <p>
              Important storage and inventory
              conditions requiring attention.
            </p>
          </div>

          <div className="warehouse-section-icon">
            🚨
          </div>
        </div>

        <div className="warehouse-alert-list">

          {storageAlert && (
            <div className="warehouse-alert critical">

              <div className="warehouse-alert-icon">
                🚨
              </div>

              <div>
                <h3>
                  Critical Storage Condition
                </h3>

                <p>
                  Storage score is below the
                  acceptable level. Inspect temperature
                  and humidity immediately.
                </p>
              </div>

            </div>
          )}

          {expiredItems.length > 0 && (
            <div className="warehouse-alert critical">

              <div className="warehouse-alert-icon">
                ⚠️
              </div>

              <div>
                <h3>
                  Expired Inventory
                </h3>

                <p>
                  {expiredItems.length} product
                  {expiredItems.length > 1
                    ? "s have"
                    : " has"}{" "}
                  expired and should be removed
                  from active inventory.
                </p>
              </div>

            </div>
          )}

          {nearExpiryItems.length > 0 && (
            <div className="warehouse-alert warning">

              <div className="warehouse-alert-icon">
                ⏳
              </div>

              <div>
                <h3>
                  Shelf-Life Warning
                </h3>

                <p>
                  {nearExpiryItems.length} product
                  {nearExpiryItems.length > 1
                    ? "s are"
                    : " is"}{" "}
                  approaching expiry within
                  7 days. Prioritize inventory rotation.
                </p>
              </div>

            </div>
          )}

          {totalAlerts === 0 && (
            <div className="warehouse-no-alerts">

              <div>✅</div>

              <h3>
                No Current Alerts
              </h3>

              <p>
                Storage and inventory conditions
                currently require no immediate action.
              </p>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default WarehouseDashboard;