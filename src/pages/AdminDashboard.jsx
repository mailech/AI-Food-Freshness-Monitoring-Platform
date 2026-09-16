import { useEffect, useState } from "react";

function AdminDashboard() {
  const [foodItems, setFoodItems] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [temperature, setTemperature] = useState(null);
  const [humidity, setHumidity] = useState(null);
  const [storageScore, setStorageScore] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAdminData = async () => {
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
          throw new Error(
            "Failed to load platform inventory data."
          );
        }

        const data = await response.json();

        setFoodItems(data);

        const savedPrediction =
          localStorage.getItem("latest_prediction");

        const savedTemperature =
          localStorage.getItem("latest_temperature");

        const savedHumidity =
          localStorage.getItem("latest_humidity");

        const savedStorageScore =
          localStorage.getItem("storage_score");

        if (savedPrediction) {
          setPrediction(
            JSON.parse(savedPrediction)
          );
        }

        if (savedTemperature) {
          setTemperature(
            Number(savedTemperature)
          );
        }

        if (savedHumidity) {
          setHumidity(
            Number(savedHumidity)
          );
        }

        if (savedStorageScore) {
          setStorageScore(
            Number(savedStorageScore)
          );
        }
      } catch (err) {
        console.error(
          "Admin dashboard error:",
          err
        );

        setError(err.message);
      }
    };

    loadAdminData();
  }, []);

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

  const totalProducts = foodItems.length;

  const totalQuantity = foodItems.reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0
  );

  const expiredItems = foodItems.filter(
    (item) => {
      const days = getDaysRemaining(item);

      return (
        days !== null &&
        days < 0
      );
    }
  );

  const expiringSoonItems =
    foodItems.filter((item) => {
      const days = getDaysRemaining(item);

      return (
        days !== null &&
        days >= 0 &&
        days <= 7
      );
    });

  const activeItems = foodItems.filter(
    (item) => {
      const days = getDaysRemaining(item);

      return (
        days === null ||
        days > 7
      );
    }
  );

  const expiredQuantity =
    expiredItems.reduce(
      (total, item) =>
        total +
        Number(item.quantity || 0),
      0
    );

  const nearExpiryQuantity =
    expiringSoonItems.reduce(
      (total, item) =>
        total +
        Number(item.quantity || 0),
      0
    );

  let storageStatus = "Not Recorded";

  if (storageScore !== null) {
    if (storageScore >= 90) {
      storageStatus = "Good";
    } else if (storageScore >= 70) {
      storageStatus = "Warning";
    } else {
      storageStatus = "Critical";
    }
  }

  const totalAlerts =
    expiredItems.length +
    expiringSoonItems.length +
    (storageScore !== null &&
    storageScore < 70
      ? 1
      : 0);

  return (
    <div className="admin-dashboard">

      {/* HEADER */}

      <div className="admin-dashboard-header">

        <div>
          <span className="admin-header-label">
            SYSTEM ADMINISTRATION
          </span>

          <h1>
            Administrator Dashboard
          </h1>

          <p>
            Monitor the Food Freshness Monitoring
            Platform, manage system activities and
            review food quality, inventory and
            storage information.
          </p>
        </div>

        <div className="admin-header-icon">
          🛡️
        </div>

      </div>

      {error && (
        <div className="admin-error">
          ⚠️ {error}
        </div>
      )}

      {/* PLATFORM OVERVIEW */}

      <div className="admin-section">

        <div className="admin-section-header">

          <div>
            <span>
              PLATFORM OVERVIEW
            </span>

            <h2>
              System Analytics
            </h2>

            <p>
              Current inventory and food monitoring
              statistics.
            </p>
          </div>

          <div className="admin-section-icon">
            📊
          </div>

        </div>

        <div className="admin-kpi-grid">

          <div className="admin-kpi-card">
            <div className="admin-kpi-icon">
              📦
            </div>

            <div>
              <span>Total Products</span>

              <strong>
                {totalProducts}
              </strong>

              <small>
                Products monitored
              </small>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-icon">
              📊
            </div>

            <div>
              <span>Total Quantity</span>

              <strong>
                {totalQuantity}
              </strong>

              <small>
                Units in inventory
              </small>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-icon">
              ⏳
            </div>

            <div>
              <span>Near Expiry</span>

              <strong>
                {expiringSoonItems.length}
              </strong>

              <small>
                Within 7 days
              </small>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-icon">
              🚨
            </div>

            <div>
              <span>Alerts</span>

              <strong>
                {totalAlerts}
              </strong>

              <small>
                Require attention
              </small>
            </div>
          </div>

        </div>

      </div>

      {/* FOOD QUALITY MONITORING */}

      <div className="admin-section">

        <div className="admin-section-header">

          <div>
            <span>
              FOOD QUALITY MONITORING
            </span>

            <h2>
              Inventory Quality Overview
            </h2>

            <p>
              Monitor active, near-expiry and
              expired food products.
            </p>
          </div>

          <div className="admin-section-icon">
            🍎
          </div>

        </div>

        <div className="admin-quality-grid">

          <div className="admin-quality-card">
            <div className="admin-quality-icon">
              ✅
            </div>

            <div>
              <span>
                Active Products
              </span>

              <strong>
                {activeItems.length}
              </strong>

              <small>
                More than 7 days remaining
              </small>
            </div>
          </div>

          <div className="admin-quality-card">
            <div className="admin-quality-icon">
              ⏳
            </div>

            <div>
              <span>
                Near Expiry
              </span>

              <strong>
                {expiringSoonItems.length}
              </strong>

              <small>
                Products within 7 days
              </small>
            </div>
          </div>

          <div className="admin-quality-card">
            <div className="admin-quality-icon">
              🚨
            </div>

            <div>
              <span>
                Expired Products
              </span>

              <strong>
                {expiredItems.length}
              </strong>

              <small>
                Requires removal
              </small>
            </div>
          </div>

          <div className="admin-quality-card">
            <div className="admin-quality-icon">
              ♻️
            </div>

            <div>
              <span>
                Expired Quantity
              </span>

              <strong>
                {expiredQuantity}
              </strong>

              <small>
                Units requiring attention
              </small>
            </div>
          </div>

        </div>

      </div>

      {/* STORAGE MONITORING */}

      <div className="admin-section">

        <div className="admin-section-header">

          <div>
            <span>
              STORAGE MONITORING
            </span>

            <h2>
              Environmental Conditions
            </h2>

            <p>
              Review the latest recorded storage
              conditions and compliance score.
            </p>
          </div>

          <div className="admin-section-icon">
            🌡️
          </div>

        </div>

        <div className="admin-storage-grid">

          <div className="admin-storage-card">
            <span>
              Temperature
            </span>

            <strong>
              {temperature !== null
                ? `${temperature}°C`
                : "--"}
            </strong>

            <small>
              Latest reading
            </small>
          </div>

          <div className="admin-storage-card">
            <span>
              Humidity
            </span>

            <strong>
              {humidity !== null
                ? `${humidity}%`
                : "--"}
            </strong>

            <small>
              Latest reading
            </small>
          </div>

          <div className="admin-storage-card">
            <span>
              Storage Score
            </span>

            <strong>
              {storageScore !== null
                ? `${storageScore}/100`
                : "--"}
            </strong>

            <small>
              Compliance score
            </small>
          </div>

          <div className="admin-storage-card">
            <span>
              Storage Status
            </span>

            <strong>
              {storageStatus}
            </strong>

            <small>
              Environmental condition
            </small>
          </div>

        </div>

      </div>

      {/* LATEST AI ASSESSMENT */}

      <div className="admin-section">

        <div className="admin-section-header">

          <div>
            <span>
              AI MONITORING
            </span>

            <h2>
              Latest Freshness Assessment
            </h2>

            <p>
              Latest food freshness and shelf-life
              assessment generated by the AI system.
            </p>
          </div>

          <div className="admin-section-icon">
            🤖
          </div>

        </div>

        {prediction ? (

          <div className="admin-prediction-card">

            <div className="admin-prediction-title">

              <div className="admin-food-icon">
                {prediction.foodEmoji || "🍎"}
              </div>

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

            <div className="admin-prediction-grid">

              <div>
                <span>
                  Freshness Status
                </span>

                <strong>
                  {prediction.status || "--"}
                </strong>
              </div>

              <div>
                <span>
                  Freshness Score
                </span>

                <strong>
                  {prediction.freshnessScore !==
                  undefined
                    ? `${prediction.freshnessScore}/100`
                    : "--"}
                </strong>
              </div>

              <div>
                <span>
                  AI Confidence
                </span>

                <strong>
                  {prediction.confidence || "--"}
                </strong>
              </div>

              <div>
                <span>
                  Shelf Life
                </span>

                <strong>
                  {prediction.shelfLife || "--"}
                </strong>
              </div>

            </div>

          </div>

        ) : (

          <div className="admin-empty-state">

            <div>🤖</div>

            <h3>
              No AI Assessment Available
            </h3>

            <p>
              Analyze a food item to generate
              freshness and shelf-life information.
            </p>

          </div>

        )}

      </div>

      {/* USER & ROLE MANAGEMENT */}

      <div className="admin-section">

        <div className="admin-section-header">

          <div>
            <span>
              USER ADMINISTRATION
            </span>

            <h2>
              User & Role Management
            </h2>

            <p>
              Monitor platform users and
              role-based access.
            </p>
          </div>

          <div className="admin-section-icon">
            👥
          </div>

        </div>

        <div className="admin-management-grid">

          <div className="admin-management-card">
            <div className="admin-management-icon">
              👤
            </div>

            <div>
              <h3>
                Registered Users
              </h3>

              <p>
                Monitor users registered on the
                platform.
              </p>
            </div>
          </div>

          <div className="admin-management-card">
            <div className="admin-management-icon">
              🔐
            </div>

            <div>
              <h3>
                Role Management
              </h3>

              <p>
                Manage Consumer, Retail Manager,
                Warehouse Operator and Food Quality
                Inspector roles.
              </p>
            </div>
          </div>

          <div className="admin-management-card">
            <div className="admin-management-icon">
              🛡️
            </div>

            <div>
              <h3>
                Access Control
              </h3>

              <p>
                Monitor role-based access and
                platform permissions.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* ALERT MANAGEMENT */}

      <div className="admin-section">

        <div className="admin-section-header">

          <div>
            <span>
              ALERT MANAGEMENT
            </span>

            <h2>
              System Alerts
            </h2>

            <p>
              Important inventory and storage
              conditions requiring attention.
            </p>
          </div>

          <div className="admin-section-icon">
            🚨
          </div>

        </div>

        <div className="admin-alert-list">

          {storageScore !== null &&
            storageScore < 70 && (
              <div className="admin-alert critical">

                <div>🚨</div>

                <div>
                  <h3>
                    Critical Storage Condition
                  </h3>

                  <p>
                    Storage compliance score is
                    below the acceptable level.
                  </p>
                </div>

              </div>
            )}

          {expiredItems.length > 0 && (
            <div className="admin-alert critical">

              <div>⚠️</div>

              <div>
                <h3>
                  Expired Inventory
                </h3>

                <p>
                  {expiredItems.length} product
                  {expiredItems.length > 1
                    ? "s have"
                    : " has"}{" "}
                  expired and requires attention.
                </p>
              </div>

            </div>
          )}

          {expiringSoonItems.length > 0 && (
            <div className="admin-alert warning">

              <div>⏳</div>

              <div>
                <h3>
                  Expiry Warning
                </h3>

                <p>
                  {expiringSoonItems.length} product
                  {expiringSoonItems.length > 1
                    ? "s are"
                    : " is"}{" "}
                  approaching expiry within
                  7 days.
                </p>
              </div>

            </div>
          )}

          {totalAlerts === 0 && (
            <div className="admin-no-alerts">

              <div>✅</div>

              <h3>
                No Current Alerts
              </h3>

              <p>
                The platform currently has no
                critical inventory or storage alerts.
              </p>

            </div>
          )}

        </div>

      </div>

      {/* REPORTING */}

      <div className="admin-section">

        <div className="admin-section-header">

          <div>
            <span>
              REPORTING
            </span>

            <h2>
              Platform Reports
            </h2>

            <p>
              Available monitoring and compliance
              reports.
            </p>
          </div>

          <div className="admin-section-icon">
            📑
          </div>

        </div>

        <div className="admin-report-grid">

          <div className="admin-report-card">
            <span>🍎</span>
            <h3>
              Freshness Report
            </h3>
            <p>
              Food freshness and spoilage analysis.
            </p>
          </div>

          <div className="admin-report-card">
            <span>📅</span>
            <h3>
              Shelf-Life Report
            </h3>
            <p>
              Remaining shelf-life and expiry
              information.
            </p>
          </div>

          <div className="admin-report-card">
            <span>📦</span>
            <h3>
              Inventory Quality
            </h3>
            <p>
              Inventory quality and product status.
            </p>
          </div>

          <div className="admin-report-card">
            <span>🌡️</span>
            <h3>
              Storage Compliance
            </h3>
            <p>
              Temperature, humidity and storage
              compliance.
            </p>
          </div>

          <div className="admin-report-card">
            <span>♻️</span>
            <h3>
              Waste Reduction
            </h3>
            <p>
              Expired and near-expiry inventory
              insights.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}

export default AdminDashboard;