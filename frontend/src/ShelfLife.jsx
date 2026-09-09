import "./ShelfLife.css";

function ShelfLife({
  foodItems,
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

  const goodShelfLife = foodItems.filter(
    (item) =>
      item.status === "Fresh" &&
      item.shelfLife &&
      item.shelfLife !== "Pending AI Analysis"
  ).length;

  const expiringSoon = foodItems.filter(
    (item) => item.status === "At Risk"
  ).length;

  const expiredItems = foodItems.filter(
    (item) => item.freshness === "Rotten"
  ).length;

  return (
    <div className="shelf-life-page">
      <aside className="shelf-life-sidebar">
        <div className="shelf-life-logo-section">
          <div className="shelf-life-logo">🍎</div>

          <div>
            <h2>FreshGuard AI</h2>
            <p>Food Monitoring</p>
          </div>
        </div>

        <nav className="shelf-life-nav">
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

          <button className="active" onClick={onShelfLife}>
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

        <div className="shelf-life-sidebar-bottom">
          <button onClick={onHome}>🏠 Back to Home</button>
        </div>
      </aside>

      <main className="shelf-life-main">
        <header className="shelf-life-header">
          <div>
            <p className="shelf-life-label">SHELF LIFE PREDICTION</p>

            <h1>Shelf Life</h1>

            <p>
              Monitor the estimated remaining shelf life of your food items.
            </p>
          </div>

          <button
            className="shelf-life-add-btn"
            onClick={onAddFood}
          >
            + Add Food
          </button>
        </header>

        <section className="shelf-life-summary">
          <div className="shelf-life-summary-card">
            <div className="shelf-life-summary-icon">📦</div>

            <div>
              <span>Total Items</span>
              <strong>{totalItems}</strong>
            </div>
          </div>

          <div className="shelf-life-summary-card">
            <div className="shelf-life-summary-icon good">✓</div>

            <div>
              <span>Good Shelf Life</span>
              <strong>{goodShelfLife}</strong>
            </div>
          </div>

          <div className="shelf-life-summary-card">
            <div className="shelf-life-summary-icon warning">⏰</div>

            <div>
              <span>Expiring Soon</span>
              <strong>{expiringSoon}</strong>
            </div>
          </div>

          <div className="shelf-life-summary-card">
            <div className="shelf-life-summary-icon danger">⚠</div>

            <div>
              <span>Expired / At Risk</span>
              <strong>{expiredItems}</strong>
            </div>
          </div>
        </section>

        <section className="shelf-life-content">
          <div className="shelf-life-items-card">
            <div className="shelf-life-card-header">
              <div>
                <h2>Remaining Shelf Life</h2>
                <p>
                  AI-predicted remaining shelf life for your registered food.
                </p>
              </div>

              <span className="shelf-life-clock">⏰</span>
            </div>

            {foodItems.length === 0 ? (
              <div className="shelf-life-empty">
                <div className="shelf-life-empty-icon">🤖</div>

                <h2>No Food Items Available</h2>

                <p>
                  Add a food item to your inventory to monitor its remaining
                  shelf life.
                </p>

                <button onClick={onAddFood}>
                  + Add Food
                </button>
              </div>
            ) : (
              <div className="shelf-life-list">
                {foodItems.map((item) => (
                  <div
                    className="shelf-life-item"
                    key={item.id}
                  >
                    <div className="shelf-life-food">
                      <span>
                        {item.foodName === "Apple"
                          ? "🍎"
                          : item.foodName === "Banana"
                          ? "🍌"
                          : "🍊"}
                      </span>

                      <div>
                        <strong>{item.foodName}</strong>
                        <small>
                          Quantity: {item.quantity}
                        </small>
                      </div>
                    </div>

                    <div className="shelf-life-date">
                      <span>Expiry Date</span>
                      <strong>{item.expiryDate}</strong>
                    </div>

                    <div className="shelf-life-result">
                      <span>Remaining Shelf Life</span>

                      <strong>
                        {item.shelfLife || "Pending AI Analysis"}
                      </strong>
                    </div>

                    <div className="shelf-life-status">
                      <span
                        className={
                          item.status === "Fresh"
                            ? "good-status"
                            : item.status === "At Risk"
                            ? "danger-status"
                            : "pending-status"
                        }
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="shelf-life-info-card">
            <div className="shelf-life-info-icon">🤖</div>

            <h2>How AI Predicts Shelf Life</h2>

            <div className="shelf-life-steps">
              <div>
                <span>1</span>
                <p>Food image is analyzed for freshness condition.</p>
              </div>

              <div>
                <span>2</span>
                <p>Freshness classification and score are generated.</p>
              </div>

              <div>
                <span>3</span>
                <p>Food information and expiry data are considered.</p>
              </div>

              <div>
                <span>4</span>
                <p>Remaining shelf life is estimated by the system.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="shelf-life-bottom-info">
          <div>💡</div>

          <div>
            <h3>Smart Shelf-Life Monitoring</h3>

            <p>
              Shelf-life prediction will be connected with the AI model and
              backend after the frontend implementation is complete.
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

export default ShelfLife;