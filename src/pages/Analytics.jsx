import { useEffect, useState } from "react";

function Analytics() {
  const [foodItems, setFoodItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFoodItems = async () => {
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

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Failed to load inventory."
          );
        }

        setFoodItems(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchFoodItems();
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

  const expiredProducts = foodItems.filter(
    (item) => {
      const days = getDaysRemaining(item);
      return days !== null && days < 0;
    }
  ).length;

  const expiringSoon = foodItems.filter(
    (item) => {
      const days = getDaysRemaining(item);
      return days !== null && days >= 0 && days <= 7;
    }
  ).length;

  const activeProducts = foodItems.filter(
    (item) => {
      const days = getDaysRemaining(item);
      return days === null || days > 7;
    }
  ).length;

  const totalQuantity = foodItems.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0
  );

  const categories = {};

  foodItems.forEach((item) => {
    const category =
      item.category || "Other";

    categories[category] =
      (categories[category] || 0) + 1;
  });

  const categoryList = Object.entries(categories);

  return (
    <div className="analytics-page">

      {/* HEADER */}

      <div className="analytics-header">

        <div>
          <span className="analytics-header-label">
            RETAIL MANAGEMENT
          </span>

          <h1>Inventory Analytics</h1>

          <p>
            Analyze inventory quality, expiry
            trends and overall product status.
          </p>
        </div>

        <div className="analytics-header-icon">
          📊
        </div>

      </div>

      {/* ERROR */}

      {error && (
        <div className="analytics-error">
          ⚠️ {error}
        </div>
      )}

      {/* SUMMARY */}

      <div className="analytics-summary">

        <div className="analytics-card">
          <div className="analytics-card-icon">
            📦
          </div>

          <div>
            <span>Total Products</span>
            <strong>{totalProducts}</strong>
            <small>Products monitored</small>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon">
            ✅
          </div>

          <div>
            <span>Active Products</span>
            <strong>{activeProducts}</strong>
            <small>More than 7 days remaining</small>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon">
            ⏳
          </div>

          <div>
            <span>Expiring Soon</span>
            <strong>{expiringSoon}</strong>
            <small>Within the next 7 days</small>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon">
            🚨
          </div>

          <div>
            <span>Expired</span>
            <strong>{expiredProducts}</strong>
            <small>Requires immediate action</small>
          </div>
        </div>

      </div>

      {/* INVENTORY INSIGHTS */}

      <div className="analytics-grid">

        <div className="analytics-section">

          <div className="analytics-section-header">
            <span>INVENTORY OVERVIEW</span>
            <h2>Inventory Status</h2>
          </div>

          <div className="analytics-status-list">

            <div className="analytics-status-row">
              <span>
                <i className="status-dot active"></i>
                Active Products
              </span>

              <strong>{activeProducts}</strong>
            </div>

            <div className="analytics-status-row">
              <span>
                <i className="status-dot warning"></i>
                Expiring Soon
              </span>

              <strong>{expiringSoon}</strong>
            </div>

            <div className="analytics-status-row">
              <span>
                <i className="status-dot danger"></i>
                Expired Products
              </span>

              <strong>{expiredProducts}</strong>
            </div>

          </div>

        </div>

        {/* QUANTITY */}

        <div className="analytics-section">

          <div className="analytics-section-header">
            <span>STOCK INFORMATION</span>
            <h2>Inventory Quantity</h2>
          </div>

          <div className="analytics-large-number">
            {totalQuantity}
          </div>

          <p className="analytics-description">
            Total quantity of food products currently
            recorded in the inventory.
          </p>

        </div>

      </div>

      {/* CATEGORY ANALYTICS */}

      <div className="analytics-section analytics-category-section">

        <div className="analytics-section-header">
          <span>PRODUCT DISTRIBUTION</span>
          <h2>Products by Category</h2>
        </div>

        {categoryList.length === 0 ? (

          <div className="analytics-empty">
            📦
            <p>
              No inventory data available.
            </p>
          </div>

        ) : (

          <div className="analytics-category-list">

            {categoryList.map(
              ([category, count]) => {

                const percentage =
                  totalProducts > 0
                    ? Math.round(
                        (count / totalProducts) *
                          100
                      )
                    : 0;

                return (
                  <div
                    className="analytics-category"
                    key={category}
                  >

                    <div className="analytics-category-top">
                      <span>{category}</span>
                      <strong>
                        {count}
                      </strong>
                    </div>

                    <div className="analytics-progress">
                      <div
                        className="analytics-progress-fill"
                        style={{
                          width: `${percentage}%`,
                        }}
                      ></div>
                    </div>

                    <small>
                      {percentage}% of inventory
                    </small>

                  </div>
                );
              }
            )}

          </div>

        )}

      </div>

    </div>
  );
}

export default Analytics;