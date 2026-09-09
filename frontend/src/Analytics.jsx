import "./Analytics.css";

function Analytics({
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
  const totalItems = foodItems.length;

  const freshCount = analysisResults.filter(
    (item) => item.freshness === "Fresh"
  ).length;

  const rottenCount = analysisResults.filter(
    (item) => item.freshness === "Rotten"
  ).length;

  const pendingCount = foodItems.filter(
    (item) => item.status === "Pending"
  ).length;

  const scores = analysisResults
    .map((item) => Number(item.score))
    .filter((score) => !Number.isNaN(score));

  const averageScore =
    scores.length > 0
      ? Math.round(
          scores.reduce((sum, score) => sum + score, 0) /
            scores.length
        )
      : 0;

  const freshPercentage =
    analysisResults.length > 0
      ? Math.round((freshCount / analysisResults.length) * 100)
      : 0;

  const rottenPercentage =
    analysisResults.length > 0
      ? Math.round((rottenCount / analysisResults.length) * 100)
      : 0;

  const getFoodIcon = (foodName) => {
    if (foodName === "Apple") return "🍎";
    if (foodName === "Banana") return "🍌";
    return "🍊";
  };

  const getFoodStats = (foodName) => {
    const results = analysisResults.filter(
      (item) => item.foodName === foodName
    );

    const fresh = results.filter(
      (item) => item.freshness === "Fresh"
    ).length;

    const rotten = results.filter(
      (item) => item.freshness === "Rotten"
    ).length;

    const foodScores = results
      .map((item) => Number(item.score))
      .filter((score) => !Number.isNaN(score));

    const avg =
      foodScores.length > 0
        ? Math.round(
            foodScores.reduce(
              (sum, score) => sum + score,
              0
            ) / foodScores.length
          )
        : 0;

    return {
      total: results.length,
      fresh,
      rotten,
      average: avg,
    };
  };

  const appleStats = getFoodStats("Apple");
  const bananaStats = getFoodStats("Banana");
  const orangeStats = getFoodStats("Orange");

  return (
    <div className="analytics-page">
      <aside className="analytics-sidebar">
        <div className="analytics-logo-section">
          <div className="analytics-logo">🍎</div>

          <div>
            <h2>FreshGuard AI</h2>
            <p>Food Monitoring</p>
          </div>
        </div>

        <nav className="analytics-nav">
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

          <button onClick={onAlerts}>
            <span>🚨</span>
            Alerts
          </button>

          <button onClick={onRecommendations}>
            <span>💡</span>
            Recommendations
          </button>

          <button
            className="active"
            onClick={onAnalytics}
          >
            <span>📈</span>
            Analytics
          </button>

          <button onClick={onProfile}>
            <span>👤</span>
            Profile
          </button>
        </nav>

        <div className="analytics-sidebar-bottom">
          <button onClick={onHome}>
            🏠 Back to Home
          </button>
        </div>
      </aside>

      <main className="analytics-main">
        <header className="analytics-header">
          <div>
            <p className="analytics-label">
              FOOD ANALYTICS
            </p>

            <h1>Analytics</h1>

            <p>
              Understand your food freshness and monitoring
              activity.
            </p>
          </div>

          <button
            className="analytics-add-btn"
            onClick={onAddFood}
          >
            + Add Food
          </button>
        </header>

        {/* SUMMARY CARDS */}

        <section className="analytics-summary">
          <div className="analytics-summary-card">
            <div className="analytics-summary-icon">
              📦
            </div>

            <div>
              <span>Total Food Items</span>
              <strong>{totalItems}</strong>
            </div>
          </div>

          <div className="analytics-summary-card">
            <div className="analytics-summary-icon fresh">
              ✓
            </div>

            <div>
              <span>Fresh Analyses</span>
              <strong>{freshCount}</strong>
            </div>
          </div>

          <div className="analytics-summary-card">
            <div className="analytics-summary-icon danger">
              ⚠
            </div>

            <div>
              <span>Rotten Analyses</span>
              <strong>{rottenCount}</strong>
            </div>
          </div>

          <div className="analytics-summary-card">
            <div className="analytics-summary-icon score">
              ⭐
            </div>

            <div>
              <span>Average Freshness</span>
              <strong>{averageScore}%</strong>
            </div>
          </div>
        </section>

        {/* OVERVIEW */}

        <section className="analytics-grid">
          <div className="analytics-card freshness-overview">
            <div className="analytics-card-header">
              <div>
                <h2>Freshness Overview</h2>

                <p>
                  Distribution of analyzed food items.
                </p>
              </div>

              <span>📊</span>
            </div>

            {analysisResults.length === 0 ? (
              <div className="analytics-empty-small">
                <div>📊</div>

                <h3>No Analysis Data</h3>

                <p>
                  Analyze your food items to see freshness
                  analytics here.
                </p>

                <button onClick={onAnalyze}>
                  Analyze Food →
                </button>
              </div>
            ) : (
              <>
                <div className="analytics-big-score">
                  <strong>{freshPercentage}%</strong>
                  <span>Freshness Rate</span>
                </div>

                <div className="analytics-progress">
                  <div
                    className="analytics-progress-fresh"
                    style={{
                      width: `${freshPercentage}%`,
                    }}
                  ></div>
                </div>

                <div className="analytics-legend">
                  <div>
                    <span className="legend-dot fresh-dot"></span>
                    <p>Fresh</p>
                    <strong>{freshCount}</strong>
                  </div>

                  <div>
                    <span className="legend-dot rotten-dot"></span>
                    <p>Rotten</p>
                    <strong>{rottenCount}</strong>
                  </div>

                  <div>
                    <span className="legend-dot pending-dot"></span>
                    <p>Pending</p>
                    <strong>{pendingCount}</strong>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ACTIVITY */}

          <div className="analytics-card activity-card">
            <div className="analytics-card-header">
              <div>
                <h2>Analysis Activity</h2>

                <p>
                  Recent AI freshness assessments.
                </p>
              </div>

              <span>🤖</span>
            </div>

            {analysisResults.length === 0 ? (
              <div className="analytics-empty-small">
                <div>🤖</div>

                <h3>No Activity Yet</h3>

                <p>
                  Your recent AI analysis activity will
                  appear here.
                </p>
              </div>
            ) : (
              <div className="analytics-activity-list">
                {analysisResults
                  .slice(0, 5)
                  .map((item) => (
                    <div
                      className="analytics-activity-item"
                      key={item.id}
                    >
                      <div className="activity-food-icon">
                        {getFoodIcon(item.foodName)}
                      </div>

                      <div className="activity-food-info">
                        <strong>
                          {item.foodName}
                        </strong>

                        <span>
                          {item.freshness} •{" "}
                          {item.score}%
                        </span>
                      </div>

                      <span
                        className={
                          item.freshness === "Fresh"
                            ? "activity-status fresh-status"
                            : "activity-status rotten-status"
                        }
                      >
                        {item.freshness}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>

        {/* FOOD-WISE ANALYTICS */}

        <section className="analytics-food-card">
          <div className="analytics-food-header">
            <div>
              <h2>Food-wise Analytics</h2>

              <p>
                Freshness performance by supported food
                category.
              </p>
            </div>

            <span>🍎 🍌 🍊</span>
          </div>

          {analysisResults.length === 0 ? (
            <div className="analytics-empty-food">
              <div>📈</div>

              <h3>No Food Analytics Available</h3>

              <p>
                Analyze Apple, Banana or Orange to generate
                food-wise analytics.
              </p>
            </div>
          ) : (
            <div className="food-analytics-grid">
              <div className="food-stat-card">
                <div className="food-stat-top">
                  <span>🍎</span>
                  <strong>Apple</strong>
                </div>

                <div className="food-stat-number">
                  {appleStats.average}%
                </div>

                <p>Average Freshness</p>

                <div className="food-stat-details">
                  <span>
                    Fresh: {appleStats.fresh}
                  </span>

                  <span>
                    Rotten: {appleStats.rotten}
                  </span>
                </div>
              </div>

              <div className="food-stat-card">
                <div className="food-stat-top">
                  <span>🍌</span>
                  <strong>Banana</strong>
                </div>

                <div className="food-stat-number">
                  {bananaStats.average}%
                </div>

                <p>Average Freshness</p>

                <div className="food-stat-details">
                  <span>
                    Fresh: {bananaStats.fresh}
                  </span>

                  <span>
                    Rotten: {bananaStats.rotten}
                  </span>
                </div>
              </div>

              <div className="food-stat-card">
                <div className="food-stat-top">
                  <span>🍊</span>
                  <strong>Orange</strong>
                </div>

                <div className="food-stat-number">
                  {orangeStats.average}%
                </div>

                <p>Average Freshness</p>

                <div className="food-stat-details">
                  <span>
                    Fresh: {orangeStats.fresh}
                  </span>

                  <span>
                    Rotten: {orangeStats.rotten}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* AI INFORMATION */}

        <section className="analytics-info">
          <div className="analytics-info-icon">
            🤖
          </div>

          <div>
            <h3>AI Analytics</h3>

            <p>
              Analytics are currently calculated from the
              food items and AI analysis results available
              in the frontend. Once the backend and AI
              model are connected, these metrics will be
              generated from actual stored analysis data.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Analytics;