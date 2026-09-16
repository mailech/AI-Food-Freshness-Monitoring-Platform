import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../App.css";

function ConsumerDashboard() {

  // ================= PREDICTION HISTORY =================

  const [predictionHistory, setPredictionHistory] = useState(() => {
    try {
      const savedHistory = localStorage.getItem("prediction_history");

      return savedHistory
        ? JSON.parse(savedHistory)
        : [];
    } catch (error) {
      console.error(
        "Failed to load prediction history:",
        error
      );

      return [];
    }
  });

  // ================= USER PROFILE =================

  const [profile, setProfile] = useState(null);

  // ================= ACTUAL INVENTORY =================

  const [inventoryItems, setInventoryItems] = useState([]);

  // ================= FETCH PROFILE =================

  const fetchProfile = async () => {

    const token = localStorage.getItem("access_token");

    if (!token) {
      return;
    }

    try {

      const response = await fetch(
        "http://127.0.0.1:8000/auth/profile",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();

      setProfile(data);

    } catch (error) {

      console.error(
        "Profile error:",
        error
      );

    }
  };

  // ================= FETCH INVENTORY =================

  const fetchInventory = async () => {

    const token = localStorage.getItem("access_token");

    if (!token) {
      return;
    }

    try {

      const response = await fetch(
        "http://127.0.0.1:8000/food/",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch inventory");
      }

      const data = await response.json();

      setInventoryItems(data);

    } catch (error) {

      console.error(
        "Inventory error:",
        error
      );

    }
  };

  // ================= LOAD DATA =================

  useEffect(() => {

    fetchProfile();

    fetchInventory();

    const loadHistory = () => {

      try {

        const savedHistory =
          localStorage.getItem("prediction_history");

        setPredictionHistory(
          savedHistory
            ? JSON.parse(savedHistory)
            : []
        );

      } catch (error) {

        console.error(
          "Failed to load prediction history:",
          error
        );

      }

    };

    window.addEventListener(
      "storage",
      loadHistory
    );

    return () => {

      window.removeEventListener(
        "storage",
        loadHistory
      );

    };

  }, []);

  // ================= STATISTICS =================

  const totalPredictions =
    predictionHistory.length;

  const freshCount =
    predictionHistory.filter(
      (item) =>
        item.freshnessLevel === "Fresh" ||
        item.freshnessLevel === "Good"
    ).length;

  const spoiledCount =
    predictionHistory.filter(
      (item) =>
        item.freshnessLevel === "Spoiled"
    ).length;

  const averageFreshness =
    predictionHistory.length > 0
      ? Math.round(
          predictionHistory.reduce(
            (sum, item) =>
              sum +
              Number(
                item.freshnessScore || 0
              ),
            0
          ) / predictionHistory.length
        )
      : 0;

  // ================= SHELF LIFE =================

  const shelfLifeItems =
    predictionHistory.filter(
      (item) =>
        item.shelfLife !== undefined ||
        item.remainingShelfLife !== undefined ||
        item.remainingDays !== undefined
    );

  const latestShelfLife =
    shelfLifeItems.length > 0
      ? shelfLifeItems[0]
      : null;

  const shelfLifeValue =
    latestShelfLife
      ? (
          latestShelfLife.shelfLife ??
          latestShelfLife.remainingShelfLife ??
          latestShelfLife.remainingDays
        )
      : null;

  // ================= INVENTORY =================

  const totalInventoryItems =
    inventoryItems.length;

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const getExpiryStatus = (expiryDate) => {

    if (!expiryDate) {
      return "Good";
    }

    const expiry =
      new Date(expiryDate);

    expiry.setHours(0, 0, 0, 0);

    const difference =
      (expiry - today) /
      (1000 * 60 * 60 * 24);

    if (difference < 0) {
      return "Expired";
    }

    if (difference <= 7) {
      return "Expiring Soon";
    }

    return "Good";
  };

  const freshInventory =
    inventoryItems.filter(
      (item) =>
        getExpiryStatus(item.expiry_date) === "Good"
    ).length;

  const atRiskInventory =
    inventoryItems.filter(
      (item) =>
        getExpiryStatus(item.expiry_date) ===
          "Expiring Soon" ||
        getExpiryStatus(item.expiry_date) ===
          "Expired"
    ).length;

  // ================= DATE =================

  const formatPredictionDate = (date) => {

    if (!date) {
      return "Today";
    }

    const predictionDate =
      new Date(date);

    const today =
      new Date();

    if (
      predictionDate.toDateString() ===
      today.toDateString()
    ) {
      return "Today";
    }

    return predictionDate.toLocaleDateString();
  };

  // ================= RECENT PREDICTIONS =================

  const recentPredictions =
    predictionHistory.slice(0, 5);

  // ================= UI =================

  return (

    <main className="dashboard-content">

      {/* ================= WELCOME SECTION ================= */}

      <section className="welcome-section">

        <div className="welcome-text">

          <h1>
            🍃 Consumer Dashboard
          </h1>

          <h2>
            Welcome back,{" "}
            {profile
              ? profile.name
              : "User"}!
          </h2>

          <p>
            Monitor your food freshness,
            review your previous analyses,
            and get AI-powered food
            quality insights.
          </p>

          <Link
            to="/food-analysis"
            className="start-btn"
          >
            Start Food Analysis →
          </Link>

        </div>


        {/* ================= FOOD ANALYSIS CARD ================= */}

        <div className="dashboard-analysis-card">

          <div className="analysis-card-icon">
            🍎
          </div>

          <h2>
            Food Freshness Analysis
          </h2>

          <p>
            Upload a food image and use
            our trained AI model to check
            its freshness condition,
            freshness score, and
            spoilage probability.
          </p>

          <Link
            to="/food-analysis"
            className="analysis-link-btn"
          >
            Go to Food Analysis
          </Link>

        </div>

      </section>


      {/* ================= STATISTICS ================= */}

      <section className="stats-container">

        <div className="stat-card">

          <h2>
            {totalPredictions}
          </h2>

          <p>
            Images Analyzed
          </p>

        </div>


        <div className="stat-card">

          <h2>
            {freshCount}
          </h2>

          <p>
            Fresh Detected
          </p>

        </div>


        <div className="stat-card">

          <h2>
            {spoiledCount}
          </h2>

          <p>
            Spoiled Detected
          </p>

        </div>


        <div className="stat-card">

          <h2>
            {averageFreshness}/100
          </h2>

          <p>
            Average Freshness
          </p>

        </div>

      </section>


      {/* ===================================================== */}
      {/* CONSUMER DASHBOARD FEATURES                          */}
      {/* ===================================================== */}

      <section className="consumer-features-section">

        <div className="section-heading">

          <div>

            <h2>
              Food Quality Overview
            </h2>

            <p>
              Monitor freshness, shelf life,
              storage, and your food inventory.
            </p>

          </div>

        </div>


        <div className="consumer-feature-grid">

          {/* ================= FRESHNESS REPORT ================= */}

          <div className="consumer-feature-card">

            <div className="consumer-feature-icon">
              📊
            </div>

            <h3>
              Freshness Reports
            </h3>

            <p>
              Review your food freshness
              analysis, quality status,
              freshness scores, and
              spoilage information.
            </p>

            <Link
              to="/reports"
              className="consumer-feature-btn"
            >
              View Reports →
            </Link>

          </div>


          {/* ================= SHELF LIFE ================= */}

          <div className="consumer-feature-card">

            <div className="consumer-feature-icon">
              ⏳
            </div>

            <h3>
              Shelf-life Estimates
            </h3>

            <div className="consumer-feature-value">

              {shelfLifeValue !== null
                ? shelfLifeValue
                : "Not available"}

            </div>

            <p>
              Check estimated remaining
              shelf life and expiry
              information for analyzed food.
            </p>

            <Link
              to="/shelf-life"
              className="consumer-feature-btn"
            >
              View Shelf Life →
            </Link>

          </div>


          {/* ================= STORAGE RECOMMENDATIONS ================= */}

          <div className="consumer-feature-card">

            <div className="consumer-feature-icon">
              💡
            </div>

            <h3>
              Storage Recommendations
            </h3>

            <p>
              Get guidance for proper
              food storage and environmental
              conditions to maintain quality.
            </p>

            <Link
              to="/storage-monitoring"
              className="consumer-feature-btn"
            >
              View Recommendations →
            </Link>

          </div>


          {/* ================= FOOD INVENTORY ================= */}

          <div className="consumer-feature-card">

            <div className="consumer-feature-icon">
              🧺
            </div>

            <h3>
              Food Inventory Overview
            </h3>

            <div className="inventory-mini-stats">

              <div>

                <strong>
                  {totalInventoryItems}
                </strong>

                <span>
                  Items
                </span>

              </div>

              <div>

                <strong>
                  {freshInventory}
                </strong>

                <span>
                  Good
                </span>

              </div>

              <div>

                <strong>
                  {atRiskInventory}
                </strong>

                <span>
                  At Risk
                </span>

              </div>

            </div>

            <p>
              Overview of your stored food
              items and their expiry status.
            </p>

            <Link
              to="/consumer-inventory"
              className="consumer-feature-btn"
            >
              Manage Food →
            </Link>

          </div>

        </div>

      </section>


      {/* ================= RECENT PREDICTIONS ================= */}

      <section className="history-section">

        <div className="section-heading">

          <div>

            <h2>
              Recent Predictions
            </h2>

            <p>
              Your latest food freshness
              analysis
            </p>

          </div>

          <Link
            to="/food-analysis"
            className="view-all-btn"
          >
            View Food Analysis
          </Link>

        </div>


        <div className="table-container">

          <table className="history-table">

            <thead>

              <tr>

                <th>
                  Food
                </th>

                <th>
                  Status
                </th>

                <th>
                  Freshness Score
                </th>

                <th>
                  Confidence
                </th>

                <th>
                  Date
                </th>

              </tr>

            </thead>


            <tbody>

              {recentPredictions.length === 0 ? (

                <tr>

                  <td
                    colSpan="5"
                    style={{
                      textAlign: "center",
                    }}
                  >
                    No predictions yet
                  </td>

                </tr>

              ) : (

                recentPredictions.map(
                  (item, index) => (

                    <tr key={index}>

                      <td>
                        {item.foodEmoji || "🍽️"}{" "}
                        {item.foodType || "Food"}
                      </td>


                      <td>

                        <span
                          className={
                            item.freshnessLevel ===
                            "Spoiled"
                              ? "spoiled"
                              : "fresh"
                          }
                        >
                          {item.freshnessLevel ||
                            item.status ||
                            "Unknown"}
                        </span>

                      </td>


                      <td>
                        {item.freshnessScore !==
                        undefined
                          ? `${item.freshnessScore}/100`
                          : "N/A"}
                      </td>


                      <td>
                        {item.confidence || "N/A"}
                      </td>


                      <td>
                        {formatPredictionDate(
                          item.date
                        )}
                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </section>

    </main>
  );
}

export default ConsumerDashboard;