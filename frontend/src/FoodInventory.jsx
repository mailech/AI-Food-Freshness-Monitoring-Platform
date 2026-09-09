import "./FoodInventory.css";

function FoodInventory({
  foodItems,
  onDeleteFood,
  onHome,
  onDashboard,
  onAddFood,
  onAnalyze,
  onShelfLife,
  onAlerts,
  onRecommendations,
  onAnalytics,
  onProfile,
}) {
  const totalItems = foodItems.length;

  const freshItems = foodItems.filter(
    (item) => item.status === "Fresh"
  ).length;

  const pendingItems = foodItems.filter(
    (item) => item.status === "Pending"
  ).length;

  const atRiskItems = foodItems.filter(
    (item) => item.status === "At Risk"
  ).length;

  return (
    <div className="inventory-page">

      <aside className="inventory-sidebar">

        <div className="inventory-logo-section">
          <div className="inventory-logo">🍎</div>

          <div>
            <h2>FreshGuard AI</h2>
            <p>Food Monitoring</p>
          </div>
        </div>

        <nav className="inventory-nav">

          <button
            className="inventory-nav-item"
            onClick={onDashboard}
          >
            <span>📊</span>
            Dashboard
          </button>

          <button className="inventory-nav-item active">
            <span>📦</span>
            Food Inventory
          </button>

          <button
            className="inventory-nav-item"
            onClick={onAnalyze}
          >
            <span>📷</span>
            Analyze Food
          </button>

          <button
            className="inventory-nav-item"
            onClick={onShelfLife}
          >
            <span>⏰</span>
            Shelf Life
          </button>

          <button
            className="inventory-nav-item"
            onClick={onAlerts}
          >
            <span>🚨</span>
            Alerts
          </button>

          <button
            className="inventory-nav-item"
            onClick={onRecommendations}
          >
            <span>💡</span>
            Recommendations
          </button>

          <button
            className="inventory-nav-item"
            onClick={onAnalytics}
          >
            <span>📈</span>
            Analytics
          </button>

          <button
            className="inventory-nav-item"
            onClick={onProfile}
          >
            <span>👤</span>
            Profile
          </button>

        </nav>

        <div className="inventory-sidebar-bottom">

          <button
            className="inventory-home-btn"
            onClick={onHome}
          >
            🏠 Back to Home
          </button>

        </div>

      </aside>

      <main className="inventory-main">

        <header className="inventory-header">

          <div>
            <p className="inventory-welcome">
              FOOD MANAGEMENT
            </p>

            <h1>Food Inventory</h1>

            <p className="inventory-subtitle">
              Manage and monitor your registered food items.
            </p>
          </div>

          <button
            className="inventory-add-btn"
            onClick={onAddFood}
          >
            + Add Food
          </button>

        </header>

        <section className="inventory-summary">

          <div className="inventory-summary-card">
            <div className="inventory-summary-icon">
              📦
            </div>

            <div>
              <span>Total Items</span>
              <strong>{totalItems}</strong>
            </div>
          </div>

          <div className="inventory-summary-card">
            <div className="inventory-summary-icon fresh">
              ✓
            </div>

            <div>
              <span>Fresh</span>
              <strong>{freshItems}</strong>
            </div>
          </div>

          <div className="inventory-summary-card">
            <div className="inventory-summary-icon expiry">
              ⏰
            </div>

            <div>
              <span>Pending AI</span>
              <strong>{pendingItems}</strong>
            </div>
          </div>

          <div className="inventory-summary-card">
            <div className="inventory-summary-icon risk">
              ⚠
            </div>

            <div>
              <span>At Risk</span>
              <strong>{atRiskItems}</strong>
            </div>
          </div>

        </section>

        <section className="inventory-container">

          <div className="inventory-toolbar">

            <div>
              <h2>My Food Items</h2>

              <p>
                Food items added by you
              </p>
            </div>

            <div className="inventory-tools">

              <div className="inventory-search">
                <span>🔍</span>

                <input
                  type="text"
                  placeholder="Search food..."
                />
              </div>

              <select className="inventory-filter">
                <option>All Status</option>
                <option>Fresh</option>
                <option>Pending</option>
                <option>At Risk</option>
              </select>

            </div>

          </div>

          {foodItems.length === 0 ? (

            <div className="empty-inventory">

              <div className="empty-inventory-icon">
                📦
              </div>

              <h2>No Food Items Yet</h2>

              <p>
                You haven't added any food items to your inventory.
              </p>

              <button onClick={onAddFood}>
                + Add Your First Food
              </button>

            </div>

          ) : (

            <div className="inventory-table-wrapper">

              <table className="inventory-table">

                <thead>
                  <tr>
                    <th>Food Item</th>
                    <th>Quantity</th>
                    <th>Added Date</th>
                    <th>Expiry Date</th>
                    <th>Freshness</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {foodItems.map((item) => (

                    <tr key={item.id}>

                      <td>

                        <div className="inventory-food">

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

                      </td>

                      <td>
                        {item.quantity}
                      </td>

                      <td>
                        {item.addedDate}
                      </td>

                      <td>
                        {item.expiryDate}
                      </td>

                      <td
                        className={
                          item.freshness === "Fresh"
                            ? "fresh-text"
                            : item.freshness === "Rotten"
                            ? "rotten-text"
                            : ""
                        }
                      >
                        {item.freshness}
                      </td>

                      <td>
                        <strong>
                          {item.score}
                        </strong>
                      </td>

                      <td>

                        <span
                          className={`inventory-status ${
                            item.status === "Fresh"
                              ? "fresh"
                              : item.status === "At Risk"
                              ? "risk"
                              : "pending"
                          }`}
                        >
                          {item.status}
                        </span>

                      </td>

                      <td>

                        <button
                          className="delete-food-btn"
                          onClick={() =>
                            onDeleteFood(item.id)
                          }
                        >
                          🗑 Delete
                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>

        <section className="inventory-info">

          <div className="inventory-info-icon">
            🤖
          </div>

          <div>

            <h3>
              AI Freshness Monitoring
            </h3>

            <p>
              Add your food item and upload its image.
              AI analysis will determine freshness,
              freshness score and remaining shelf life.
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

export default FoodInventory;