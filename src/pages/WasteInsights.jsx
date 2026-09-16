import { useEffect, useState } from "react";

function WasteInsights() {
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

  const expiredItems = foodItems.filter((item) => {
    const days = getDaysRemaining(item);
    return days !== null && days < 0;
  });

  const nearExpiryItems = foodItems.filter((item) => {
    const days = getDaysRemaining(item);
    return days !== null && days >= 0 && days <= 7;
  });

  const wasteQuantity = expiredItems.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0
  );

  const nearExpiryQuantity = nearExpiryItems.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0
  );

  const categories = {};

  expiredItems.forEach((item) => {
    const category = item.category || "Other";

    categories[category] =
      (categories[category] || 0) +
      Number(item.quantity || 0);
  });

  const categoryList = Object.entries(categories);

  return (
    <div className="waste-insights-page">

      {/* HEADER */}

      <div className="waste-insights-header">

        <div>
          <span className="waste-insights-header-label">
            RETAIL MANAGEMENT
          </span>

          <h1>Waste Insights</h1>

          <p>
            Monitor expired and near-expiry products
            to reduce food waste and improve inventory
            management.
          </p>
        </div>

        <div className="waste-insights-header-icon">
          ♻️
        </div>

      </div>

      {/* ERROR */}

      {error && (
        <div className="waste-insights-error">
          ⚠️ {error}
        </div>
      )}

      {/* SUMMARY */}

      <div className="waste-insights-summary">

        <div className="waste-summary-card">

          <div className="waste-summary-icon">
            🚨
          </div>

          <div>
            <span>Expired Products</span>
            <strong>{expiredItems.length}</strong>
            <small>Requires removal</small>
          </div>

        </div>

        <div className="waste-summary-card">

          <div className="waste-summary-icon">
            📦
          </div>

          <div>
            <span>Expired Quantity</span>
            <strong>{wasteQuantity}</strong>
            <small>Units affected</small>
          </div>

        </div>

        <div className="waste-summary-card">

          <div className="waste-summary-icon">
            ⏳
          </div>

          <div>
            <span>Near Expiry</span>
            <strong>{nearExpiryItems.length}</strong>
            <small>Within 7 days</small>
          </div>

        </div>

        <div className="waste-summary-card">

          <div className="waste-summary-icon">
            ⚠️
          </div>

          <div>
            <span>At-Risk Quantity</span>
            <strong>{nearExpiryQuantity}</strong>
            <small>Units to prioritize</small>
          </div>

        </div>

      </div>

      {/* WASTE REDUCTION ACTIONS */}

      <div className="waste-insights-section">

        <div className="waste-section-header">
          <span>WASTE REDUCTION</span>

          <h2>Recommended Actions</h2>

          <p>
            Actions based on current inventory
            expiry information.
          </p>
        </div>

        <div className="waste-actions">

          <div className="waste-action-card">

            <div className="waste-action-icon">
              🔄
            </div>

            <div>
              <h3>Use FIFO Rotation</h3>

              <p>
                Move products with earlier expiry
                dates to the front of the inventory
                to encourage timely usage or sale.
              </p>
            </div>

          </div>

          <div className="waste-action-card">

            <div className="waste-action-icon">
              🏷️
            </div>

            <div>
              <h3>Prioritize Near-Expiry Items</h3>

              <p>
                Give products approaching expiry
                priority for sale or consumption.
              </p>
            </div>

          </div>

          <div className="waste-action-card">

            <div className="waste-action-icon">
              🗑️
            </div>

            <div>
              <h3>Remove Expired Products</h3>

              <p>
                Remove expired products from active
                inventory to maintain food safety
                and inventory accuracy.
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* CATEGORY ANALYSIS */}

      <div className="waste-insights-section">

        <div className="waste-section-header">
          <span>WASTE DISTRIBUTION</span>

          <h2>Expired Quantity by Category</h2>

          <p>
            Categories contributing to the current
            expired inventory quantity.
          </p>
        </div>

        {categoryList.length === 0 ? (

          <div className="waste-empty">
            <div>♻️</div>

            <h3>No Expired Products</h3>

            <p>
              There are currently no expired products
              recorded in the inventory.
            </p>
          </div>

        ) : (

          <div className="waste-category-list">

            {categoryList.map(
              ([category, quantity]) => {

                const percentage =
                  wasteQuantity > 0
                    ? Math.round(
                        (quantity /
                          wasteQuantity) *
                          100
                      )
                    : 0;

                return (
                  <div
                    className="waste-category"
                    key={category}
                  >

                    <div className="waste-category-top">

                      <span>{category}</span>

                      <strong>
                        {quantity} units
                      </strong>

                    </div>

                    <div className="waste-progress">

                      <div
                        className="waste-progress-fill"
                        style={{
                          width: `${percentage}%`,
                        }}
                      ></div>

                    </div>

                    <small>
                      {percentage}% of expired
                      quantity
                    </small>

                  </div>
                );
              }
            )}

          </div>

        )}

      </div>

      {/* NEAR EXPIRY PRODUCTS */}

      <div className="waste-insights-section">

        <div className="waste-section-header">
          <span>PRIORITY INVENTORY</span>

          <h2>Products Requiring Attention</h2>

          <p>
            Products that are expired or approaching
            their expiry date.
          </p>
        </div>

        {expiredItems.length === 0 &&
        nearExpiryItems.length === 0 ? (

          <div className="waste-empty">
            <div>✅</div>

            <h3>Inventory Looks Good</h3>

            <p>
              No products currently require urgent
              waste-reduction action.
            </p>
          </div>

        ) : (

          <div className="waste-product-list">

            {[...expiredItems, ...nearExpiryItems].map(
              (item) => {

                const days =
                  getDaysRemaining(item);

                return (
                  <div
                    className="waste-product-row"
                    key={item.food_id}
                  >

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

                    <div className="waste-product-quantity">
                      {item.quantity || 0} units
                    </div>

                    <div
                      className={
                        days < 0
                          ? "waste-status expired"
                          : "waste-status warning"
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
              }
            )}

          </div>

        )}

      </div>

    </div>
  );
}

export default WasteInsights;