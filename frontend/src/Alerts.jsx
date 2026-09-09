import "./Alerts.css";

function Alerts({
  foodItems,
  analysisResults,
  onHome,
  onDashboard,
  onInventory,
  onAddFood,
  onAnalyze,
  onShelfLife,
  onAlerts,
  onRecommendations,
  onAnalytics,
  onProfile,
}) {
  const alerts = [];

  // Rotten / AI risk alerts
  analysisResults.forEach((item) => {
    if (item.freshness === "Rotten") {
      alerts.push({
        id: `rotten-${item.id}`,
        type: "danger",
        icon: "🚨",
        title: "Rotten Food Detected",
        foodName: item.foodName,
        message: "AI analysis detected signs of spoilage.",
        action: "Do not consume",
        score: item.score,
      });
    }
  });

  // Near expiry alerts
  foodItems.forEach((item) => {
    if (item.status === "Near Expiry") {
      alerts.push({
        id: `expiry-${item.id}`,
        type: "warning",
        icon: "⏰",
        title: "Food Near Expiry",
        foodName: item.foodName,
        message: "This food item is approaching its expiry date.",
        action: "Use soon",
        score: null,
      });
    }

    // At risk inventory items
    if (
      item.status === "At Risk" &&
      !analysisResults.some(
        (result) =>
          result.foodId === item.id &&
          result.freshness === "Rotten"
      )
    ) {
      alerts.push({
        id: `risk-${item.id}`,
        type: "danger",
        icon: "⚠️",
        title: "Food At Risk",
        foodName: item.foodName,
        message: "This food item requires attention.",
        action: "Check food condition",
        score: item.score !== "--" ? item.score : null,
      });
    }
  });

  const dangerCount = alerts.filter(
    (alert) => alert.type === "danger"
  ).length;

  const warningCount = alerts.filter(
    (alert) => alert.type === "warning"
  ).length;

  const totalAlerts = alerts.length;

  return (
    <div className="alerts-page">

      {/* SIDEBAR */}

      <aside className="alerts-sidebar">

        <div className="alerts-logo-section">
          <div className="alerts-logo">🍎</div>

          <div>
            <h2>FreshGuard AI</h2>
            <p>Food Monitoring</p>
          </div>
        </div>

        <nav className="alerts-nav">

          <button onClick={onDashboard}>
            <span>📊</span>
            Dashboard
          </button>

          <button onClick={onInventory}>
            <span>📦</span>
            Food Inventory
          </button>

          <button onClick={onAnalyze}>
            <span>📷</span>
            Analyze Food
          </button>

          <button onClick={onShelfLife}>
            <span>⏰</span>
            Shelf Life
          </button>

          <button
            className="active"
            onClick={onAlerts}
          >
            <span>🚨</span>
            Alerts
          </button>

          <button onClick={onRecommendations}>
            <span>💡</span>
            Recommendations
          </button>

          <button onClick={onAnalytics}>
            <span>📈</span>
            Analytics
          </button>

          <button onClick={onProfile}>
            <span>👤</span>
            Profile
          </button>

        </nav>

        <div className="alerts-sidebar-bottom">
          <button onClick={onHome}>
            🏠 Back to Home
          </button>
        </div>

      </aside>

      {/* MAIN */}

      <main className="alerts-main">

        <header className="alerts-header">

          <div>
            <p className="alerts-label">
              FOOD SAFETY MONITORING
            </p>

            <h1>Alerts</h1>

            <p>
              Monitor important food freshness and
              safety notifications.
            </p>
          </div>

          <button
            className="alerts-add-btn"
            onClick={onAddFood}
          >
            + Add Food
          </button>

        </header>

        {/* SUMMARY */}

        <section className="alerts-summary">

          <div className="alerts-summary-card">

            <div className="alerts-summary-icon">
              🔔
            </div>

            <div>
              <span>Total Alerts</span>
              <strong>{totalAlerts}</strong>
            </div>

          </div>

          <div className="alerts-summary-card">

            <div className="alerts-summary-icon danger">
              🚨
            </div>

            <div>
              <span>High Priority</span>
              <strong>{dangerCount}</strong>
            </div>

          </div>

          <div className="alerts-summary-card">

            <div className="alerts-summary-icon warning">
              ⏰
            </div>

            <div>
              <span>Warnings</span>
              <strong>{warningCount}</strong>
            </div>

          </div>

          <div className="alerts-summary-card">

            <div className="alerts-summary-icon safe">
              ✓
            </div>

            <div>
              <span>Food Safety</span>
              <strong>
                {totalAlerts === 0 ? "Good" : "Review"}
              </strong>
            </div>

          </div>

        </section>

        {/* ALERT LIST */}

        <section className="alerts-container">

          <div className="alerts-container-header">

            <div>
              <h2>Recent Alerts</h2>

              <p>
                Important notifications generated from
                your food monitoring data.
              </p>
            </div>

            <span className="alerts-count">
              {totalAlerts} alert
              {totalAlerts !== 1 ? "s" : ""}
            </span>

          </div>

          {alerts.length === 0 ? (

            <div className="alerts-empty">

              <div className="alerts-empty-icon">
                🔔
              </div>

              <h2>No Alerts Yet</h2>

              <p>
                You currently have no food safety alerts.
                Alerts will appear here when your food
                requires attention.
              </p>

              {foodItems.length === 0 ? (
                <button onClick={onAddFood}>
                  + Add Food
                </button>
              ) : (
                <button onClick={onAnalyze}>
                  📷 Analyze Food
                </button>
              )}

            </div>

          ) : (

            <div className="alerts-list">

              {alerts.map((alert) => (

                <div
                  className={`alert-item ${alert.type}`}
                  key={alert.id}
                >

                  <div className="alert-icon">
                    {alert.icon}
                  </div>

                  <div className="alert-content">

                    <div className="alert-title-row">

                      <h3>
                        {alert.title}
                      </h3>

                      <span className="alert-priority">
                        {alert.type === "danger"
                          ? "High Priority"
                          : "Warning"}
                      </span>

                    </div>

                    <strong className="alert-food-name">
                      {alert.foodName === "Apple"
                        ? "🍎"
                        : alert.foodName === "Banana"
                        ? "🍌"
                        : "🍊"}{" "}
                      {alert.foodName}
                    </strong>

                    <p>
                      {alert.message}
                    </p>

                    <div className="alert-details">

                      {alert.score !== null && (
                        <span>
                          Freshness Score:{" "}
                          <strong>
                            {alert.score}%
                          </strong>
                        </span>
                      )}

                      <span>
                        Recommended Action:{" "}
                        <strong>
                          {alert.action}
                        </strong>
                      </span>

                    </div>

                  </div>

                  <div className="alert-arrow">
                    →
                  </div>

                </div>

              ))}

            </div>

          )}

        </section>

        {/* INFORMATION */}

        <section className="alerts-info">

          <div className="alerts-info-icon">
            🤖
          </div>

          <div>
            <h3>
              AI-Powered Food Safety Alerts
            </h3>

            <p>
              FreshGuard AI generates alerts based on
              food freshness analysis and monitoring
              information. This helps you identify food
              items that may require attention.
            </p>
          </div>

          <button onClick={onAnalyze}>
            Analyze Food →
          </button>

        </section>

      </main>

    </div>
  );
}

export default Alerts;