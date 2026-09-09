import "./Recommendations.css";

function Recommendations({
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
  const recommendations = [];

  analysisResults.forEach((analysis) => {
    if (analysis.freshness === "Rotten") {
      recommendations.push({
        type: "danger",
        icon: "⚠️",
        title: `${analysis.foodName} should not be consumed`,
        description:
          "The AI analysis indicates signs of spoilage. Do not consume this food item.",
        action: "Discard the item safely.",
      });
    } else if (analysis.freshness === "Fresh") {
      if (analysis.foodName === "Apple") {
        recommendations.push({
          type: "storage",
          icon: "🍎",
          title: "Store Apple properly",
          description:
            "Keep apples in a cool environment. Refrigeration can help maintain freshness for a longer period.",
          action: "Store in a cool place or refrigerator.",
        });
      }

      if (analysis.foodName === "Banana") {
        recommendations.push({
          type: "storage",
          icon: "🍌",
          title: "Store Banana properly",
          description:
            "Keep bananas at room temperature and away from direct sunlight or excessive heat.",
          action: "Keep at room temperature.",
        });
      }

      if (analysis.foodName === "Orange") {
        recommendations.push({
          type: "storage",
          icon: "🍊",
          title: "Store Orange properly",
          description:
            "Keep oranges in a cool and dry place. Refrigeration can help extend their freshness.",
          action: "Store in a cool place or refrigerator.",
        });
      }
    }
  });

  foodItems.forEach((item) => {
    if (item.status === "Pending") {
      recommendations.push({
        type: "pending",
        icon: "🤖",
        title: `Analyze ${item.foodName}`,
        description:
          "This food item has not received an AI freshness assessment yet.",
        action: "Upload an image and analyze the food.",
      });
    }

    if (item.status === "At Risk") {
      recommendations.push({
        type: "warning",
        icon: "⏰",
        title: `${item.foodName} needs attention`,
        description:
          "This food item is currently marked as at risk and should be checked soon.",
        action: "Analyze the food and consume or discard based on the result.",
      });
    }
  });

  const freshCount = analysisResults.filter(
    (item) => item.freshness === "Fresh"
  ).length;

  const rottenCount = analysisResults.filter(
    (item) => item.freshness === "Rotten"
  ).length;

  const pendingCount = foodItems.filter(
    (item) => item.status === "Pending"
  ).length;

  return (
    <div className="recommendations-page">
      <aside className="recommendations-sidebar">
        <div className="recommendations-logo-section">
          <div className="recommendations-logo">🍎</div>

          <div>
            <h2>FreshGuard AI</h2>
            <p>Food Monitoring</p>
          </div>
        </div>

        <nav className="recommendations-nav">
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

          <button className="active" onClick={onRecommendations}>
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

        <div className="recommendations-sidebar-bottom">
          <button onClick={onHome}>🏠 Back to Home</button>
        </div>
      </aside>

      <main className="recommendations-main">
        <header className="recommendations-header">
          <div>
            <p className="recommendations-label">
              SMART FOOD RECOMMENDATIONS
            </p>

            <h1>Recommendations</h1>

            <p>
              Get practical recommendations based on your food freshness
              analysis.
            </p>
          </div>

          <button
            className="recommendations-add-btn"
            onClick={onAddFood}
          >
            + Add Food
          </button>
        </header>

        <section className="recommendations-summary">
          <div className="recommendations-summary-card">
            <div className="recommendations-summary-icon">✓</div>

            <div>
              <span>Fresh Items</span>
              <strong>{freshCount}</strong>
            </div>
          </div>

          <div className="recommendations-summary-card">
            <div className="recommendations-summary-icon warning">
              ⚠
            </div>

            <div>
              <span>Needs Attention</span>
              <strong>{rottenCount}</strong>
            </div>
          </div>

          <div className="recommendations-summary-card">
            <div className="recommendations-summary-icon pending">
              🤖
            </div>

            <div>
              <span>Pending Analysis</span>
              <strong>{pendingCount}</strong>
            </div>
          </div>

          <div className="recommendations-summary-card">
            <div className="recommendations-summary-icon info">
              💡
            </div>

            <div>
              <span>Total Recommendations</span>
              <strong>{recommendations.length}</strong>
            </div>
          </div>
        </section>

        <section className="recommendations-container">
          <div className="recommendations-title-row">
            <div>
              <h2>Smart Recommendations</h2>

              <p>
                Recommendations generated from your current food data.
              </p>
            </div>

            <span className="recommendations-ai-badge">
              🤖 AI Powered
            </span>
          </div>

          {recommendations.length === 0 ? (
            <div className="recommendations-empty">
              <div className="recommendations-empty-icon">💡</div>

              <h2>No Recommendations Yet</h2>

              <p>
                Add a food item and analyze its image to receive
                freshness-based recommendations.
              </p>

              <div className="recommendations-empty-actions">
                <button onClick={onAddFood}>
                  + Add Food
                </button>

                <button
                  className="secondary"
                  onClick={onAnalyze}
                >
                  Analyze Food →
                </button>
              </div>
            </div>
          ) : (
            <div className="recommendations-list">
              {recommendations.map((recommendation, index) => (
                <div
                  className={`recommendation-card ${recommendation.type}`}
                  key={`${recommendation.title}-${index}`}
                >
                  <div className="recommendation-icon">
                    {recommendation.icon}
                  </div>

                  <div className="recommendation-content">
                    <div className="recommendation-heading">
                      <h3>{recommendation.title}</h3>

                      <span>
                        {recommendation.type === "danger"
                          ? "Food Safety"
                          : recommendation.type === "warning"
                          ? "Attention"
                          : recommendation.type === "pending"
                          ? "Analysis Required"
                          : "Storage"}
                      </span>
                    </div>

                    <p>{recommendation.description}</p>

                    <div className="recommendation-action">
                      <strong>Recommended Action:</strong>

                      <span>{recommendation.action}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="recommendations-info">
          <div className="recommendations-info-icon">🤖</div>

          <div>
            <h3>How Recommendations Work</h3>

            <p>
              FreshGuard AI uses food freshness classification, freshness
              scores, shelf-life information and food status to generate
              useful recommendations.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Recommendations;