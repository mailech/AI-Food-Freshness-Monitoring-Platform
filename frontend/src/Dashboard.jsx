import "./Dashboard.css";

function Dashboard({
  foodItems,
  analysisResults,
  onHome,
  onDashboard,
  onAddFood,
  onAnalyze,
  onInventory,
  onAlerts,
  onShelfLife,
  onRecommendations,
  onAnalytics,
  onProfile,
}) {
  const totalFoodItems = foodItems.length;

  const freshItems = analysisResults.filter(
    (item) => item.freshness === "Fresh"
  ).length;

  const rottenItems = analysisResults.filter(
    (item) => item.freshness === "Rotten"
  ).length;

  const nearExpiryItems = foodItems.filter(
    (item) => item.status === "Near Expiry"
  ).length;

  const atRiskItems =
    rottenItems +
    foodItems.filter((item) => item.status === "At Risk").length;

  const analyzedItems = analysisResults.length;

  const averageScore =
    analyzedItems > 0
      ? Math.round(
          analysisResults.reduce(
            (total, item) => total + Number(item.score),
            0
          ) / analyzedItems
        )
      : 0;

  const recentAlerts = analysisResults.filter(
    (item) => item.freshness === "Rotten"
  );

  const recentFoodAnalysis = analysisResults.slice(0, 5);

  return (
    <div className="dashboard-page">

      <aside className="dashboard-sidebar">

        <div className="dashboard-logo-section">
          <div className="dashboard-logo">🍎</div>

          <div>
            <h2>FreshGuard AI</h2>
            <p>Food Monitoring</p>
          </div>
        </div>

        <nav className="dashboard-nav">

          <button
            className="active"
            onClick={onDashboard}
          >
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

          <button onClick={onAlerts}>
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

        <div className="dashboard-sidebar-bottom">
          <button onClick={onHome}>
            🏠 Back to Home
          </button>
        </div>

      </aside>

      <main className="dashboard-main">

        <header className="dashboard-header">

          <div>
            <p className="dashboard-label">
              WELCOME BACK 👋
            </p>

            <h1>Food Freshness Dashboard</h1>

            <p>
              Monitor your food condition and freshness at a glance.
            </p>
          </div>

          <div className="dashboard-header-actions">

            <button
              className="dashboard-analyze-btn"
              onClick={onAnalyze}
            >
              📷 Analyze Food
            </button>

            <button
              className="dashboard-add-btn"
              onClick={onAddFood}
            >
              + Add Food
            </button>

          </div>

        </header>

        <section className="dashboard-summary">

          <div className="dashboard-summary-card">

            <div className="dashboard-summary-icon">
              📦
            </div>

            <div>
              <span>Total Food Items</span>

              <strong>
                {totalFoodItems}
              </strong>

              <small>
                {totalFoodItems === 0
                  ? "No food added yet"
                  : "Currently monitored"}
              </small>
            </div>

          </div>

          <div className="dashboard-summary-card">

            <div className="dashboard-summary-icon fresh">
              ✓
            </div>

            <div>
              <span>Fresh Items</span>

              <strong>
                {freshItems}
              </strong>

              <small>
                {analyzedItems === 0
                  ? "Awaiting AI analysis"
                  : `${freshItems} analyzed as fresh`}
              </small>
            </div>

          </div>

          <div className="dashboard-summary-card">

            <div className="dashboard-summary-icon expiry">
              ⏰
            </div>

            <div>
              <span>Near Expiry</span>

              <strong>
                {nearExpiryItems}
              </strong>

              <small>
                {nearExpiryItems === 0
                  ? "No items near expiry"
                  : "Need attention"}
              </small>
            </div>

          </div>

          <div className="dashboard-summary-card">

            <div className="dashboard-summary-icon risk">
              ⚠
            </div>

            <div>
              <span>AI Risk</span>

              <strong>
                {atRiskItems}
              </strong>

              <small>
                {atRiskItems === 0
                  ? "No risk detected"
                  : "Check immediately"}
              </small>
            </div>

          </div>

        </section>

        <section className="dashboard-middle-grid">

          <div className="dashboard-panel freshness-panel">

            <div className="dashboard-panel-heading">

              <div>
                <h2>Freshness Overview</h2>

                <p>
                  Current AI freshness assessment
                </p>
              </div>

              {analyzedItems > 0 && (
                <span
                  className="dashboard-view-link"
                  onClick={onAnalyze}
                >
                  Analyze More →
                </span>
              )}

            </div>

            {analyzedItems === 0 ? (

              <div className="dashboard-empty">

                <div className="dashboard-empty-icon">
                  🤖
                </div>

                <h3>
                  No Freshness Analysis Yet
                </h3>

                <p>
                  Add a food item and analyze its image
                  to see freshness information here.
                </p>

                <button onClick={onAnalyze}>
                  📷 Analyze Food
                </button>

              </div>

            ) : (

              <div className="freshness-overview-content">

                <div className="freshness-score-circle">

                  <div>
                    <strong>
                      {averageScore}%
                    </strong>

                    <span>
                      Overall Freshness
                    </span>
                  </div>

                </div>

                <div className="freshness-stats">

                  <div>
                    <span className="fresh-dot"></span>
                    <p>Fresh</p>
                    <strong>{freshItems}</strong>
                  </div>

                  <div>
                    <span className="rotten-dot"></span>
                    <p>Rotten</p>
                    <strong>{rottenItems}</strong>
                  </div>

                  <div>
                    <span className="pending-dot"></span>
                    <p>Pending</p>
                    <strong>
                      {Math.max(
                        totalFoodItems - analyzedItems,
                        0
                      )}
                    </strong>
                  </div>

                </div>

              </div>

            )}

          </div>

          <div className="dashboard-panel alerts-panel">

            <div className="dashboard-panel-heading">

              <div>
                <h2>Recent Alerts</h2>

                <p>
                  Items requiring attention
                </p>
              </div>

              {recentAlerts.length > 0 && (
                <span
                  className="dashboard-view-link"
                  onClick={onAlerts}
                >
                  View All
                </span>
              )}

            </div>

            {recentAlerts.length === 0 ? (

              <div className="dashboard-alert-empty">

                <div>🔔</div>

                <h3>
                  No Alerts Yet
                </h3>

                <p>
                  Alerts will appear when food requires attention.
                </p>

                {foodItems.length === 0 && (
                  <button onClick={onAddFood}>
                    + Add Food
                  </button>
                )}

              </div>

            ) : (

              <div className="dashboard-alert-list">

                {recentAlerts.slice(0, 3).map((item) => (

                  <div
                    className="dashboard-alert-item"
                    key={item.id}
                  >

                    <div className="dashboard-alert-food">

                      {item.foodName === "Apple"
                        ? "🍎"
                        : item.foodName === "Banana"
                        ? "🍌"
                        : "🍊"}

                    </div>

                    <div>
                      <strong>
                        {item.foodName}
                      </strong>

                      <p>
                        Spoilage risk detected
                      </p>
                    </div>

                    <span>
                      Now
                    </span>

                  </div>

                ))}

              </div>

            )}

          </div>

        </section>

        <section className="dashboard-panel dashboard-analysis-panel">

          <div className="dashboard-panel-heading">

            <div>
              <h2>Recent Food Analysis</h2>

              <p>
                Latest AI freshness assessments
              </p>
            </div>

            {recentFoodAnalysis.length > 0 && (
              <span
                className="dashboard-view-link"
                onClick={onAnalyze}
              >
                Analyze New Food →
              </span>
            )}

          </div>

          {recentFoodAnalysis.length === 0 ? (

            <div className="dashboard-analysis-empty">

              <div className="dashboard-empty-icon">
                📷
              </div>

              <h3>
                No Food Analysis Yet
              </h3>

              <p>
                Your AI freshness analysis results will appear
                here after you analyze a food image.
              </p>

              <button onClick={onAnalyze}>
                Start AI Analysis
              </button>

            </div>

          ) : (

            <div className="dashboard-analysis-table">

              <div className="dashboard-table-header">
                <span>Food Item</span>
                <span>Freshness</span>
                <span>Score</span>
                <span>Shelf Life</span>
                <span>Status</span>
              </div>

              {recentFoodAnalysis.map((item) => {

                const isFresh =
                  item.freshness === "Fresh";

                return (
                  <div
                    className="dashboard-table-row"
                    key={item.id}
                  >

                    <div className="dashboard-food-name">

                      <span>
                        {item.foodName === "Apple"
                          ? "🍎"
                          : item.foodName === "Banana"
                          ? "🍌"
                          : "🍊"}
                      </span>

                      <strong>
                        {item.foodName}
                      </strong>

                    </div>

                    <span
                      className={
                        isFresh
                          ? "dashboard-fresh-text"
                          : "dashboard-rotten-text"
                      }
                    >
                      {item.freshness}
                    </span>

                    <strong>
                      {item.score}%
                    </strong>

                    <span>
                      {item.shelfLife}
                    </span>

                    <span
                      className={
                        isFresh
                          ? "dashboard-status-fresh"
                          : "dashboard-status-risk"
                      }
                    >
                      {isFresh
                        ? "Fresh"
                        : "AI Risk"}
                    </span>

                  </div>
                );
              })}

            </div>

          )}

        </section>

        <section className="dashboard-quick-actions">

          <div className="dashboard-section-title">

            <h2>
              Quick Actions
            </h2>

            <p>
              Manage your food monitoring quickly
            </p>

          </div>

          <div className="quick-action-grid">

            <button onClick={onAddFood}>

              <span>📦</span>

              <div>
                <strong>
                  Add Food
                </strong>

                <p>
                  Register a new food item
                </p>
              </div>

              <b>→</b>

            </button>

            <button onClick={onAnalyze}>

              <span>📷</span>

              <div>
                <strong>
                  AI Analysis
                </strong>

                <p>
                  Check food freshness
                </p>
              </div>

              <b>→</b>

            </button>

            <button onClick={onAlerts}>

              <span>🚨</span>

              <div>
                <strong>
                  View Alerts
                </strong>

                <p>
                  Check important notifications
                </p>
              </div>

              <b>→</b>

            </button>

            <button onClick={onRecommendations}>

              <span>💡</span>

              <div>
                <strong>
                  Recommendations
                </strong>

                <p>
                  Get smart food suggestions
                </p>
              </div>

              <b>→</b>

            </button>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Dashboard;