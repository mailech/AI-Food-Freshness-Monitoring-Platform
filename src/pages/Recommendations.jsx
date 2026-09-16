import { useEffect, useState } from "react";

function Recommendations() {
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

  const getRecommendation = (item) => {
    const days = getDaysRemaining(item);

    if (days === null) {
      return {
        type: "info",
        icon: "ℹ️",
        title: "Monitor Product",
        message:
          "No expiry date is available. Monitor this product regularly.",
      };
    }

    if (days < 0) {
      return {
        type: "danger",
        icon: "🚨",
        title: "Remove from Inventory",
        message:
          "This product has expired. Remove it from active inventory to maintain food safety.",
      };
    }

    if (days === 0) {
      return {
        type: "danger",
        icon: "⚠️",
        title: "Immediate Action Required",
        message:
          "This product expires today. Prioritize it for immediate sale or consumption.",
      };
    }

    if (days <= 3) {
      return {
        type: "warning",
        icon: "⏳",
        title: "Prioritize This Product",
        message:
          "This product is approaching expiry. Prioritize it for sale or consumption.",
      };
    }

    if (days <= 7) {
      return {
        type: "warning",
        icon: "📅",
        title: "Plan Inventory Rotation",
        message:
          "This product expires within 7 days. Consider using FIFO inventory rotation.",
      };
    }

    return {
      type: "success",
      icon: "✅",
      title: "Continue Current Storage",
      message:
        "This product has sufficient shelf life. Continue monitoring its storage and expiry date.",
    };
  };

  const recommendations = foodItems
    .map((item) => ({
      ...item,
      recommendation: getRecommendation(item),
    }))
    .sort((a, b) => {
      const priority = {
        danger: 1,
        warning: 2,
        info: 3,
        success: 4,
      };

      return (
        priority[a.recommendation.type] -
        priority[b.recommendation.type]
      );
    });

  const urgentCount = recommendations.filter(
    (item) =>
      item.recommendation.type === "danger"
  ).length;

  const warningCount = recommendations.filter(
    (item) =>
      item.recommendation.type === "warning"
  ).length;

  return (
    <div className="recommendations-page">

      {/* =========================
          HEADER
      ========================= */}

      <div className="recommendations-header">

        <div>
          <span className="recommendations-header-label">
            RETAIL MANAGEMENT
          </span>

          <h1>Recommendation Engine</h1>

          <p>
            Get actionable recommendations for
            inventory rotation, consumption and
            waste reduction.
          </p>
        </div>

        <div className="recommendations-header-icon">
          💡
        </div>

      </div>

      {/* =========================
          ERROR
      ========================= */}

      {error && (
        <div className="recommendations-error">
          ⚠️ {error}
        </div>
      )}

      {/* =========================
          SUMMARY CARDS
      ========================= */}

      <div className="recommendations-summary">

        <div className="recommendation-summary-card">
          <span className="recommendation-summary-icon">
            📦
          </span>

          <div>
            <span>Total Products</span>
            <strong>{foodItems.length}</strong>
            <small>Currently monitored</small>
          </div>
        </div>

        <div className="recommendation-summary-card">
          <span className="recommendation-summary-icon">
            ⚠️
          </span>

          <div>
            <span>Action Required</span>
            <strong>{urgentCount}</strong>
            <small>Expired or immediate action</small>
          </div>
        </div>

        <div className="recommendation-summary-card">
          <span className="recommendation-summary-icon">
            ⏳
          </span>

          <div>
            <span>Plan Ahead</span>
            <strong>{warningCount}</strong>
            <small>Expiring within 7 days</small>
          </div>
        </div>

      </div>

      {/* =========================
          RECOMMENDATIONS
      ========================= */}

      <div className="recommendations-content">

        <div className="recommendations-section-header">
          <div>
            <span className="recommendations-section-label">
              SMART INVENTORY GUIDANCE
            </span>

            <h2>Product Recommendations</h2>

            <p>
              Recommendations are generated from
              inventory expiry information.
            </p>
          </div>
        </div>

        {recommendations.length === 0 ? (

          <div className="recommendations-empty">
            <div>📦</div>

            <h3>No Inventory Products</h3>

            <p>
              Add food products to your inventory
              to receive recommendations.
            </p>
          </div>

        ) : (

          <div className="recommendations-list">

            {recommendations.map((item) => {

              const days =
                getDaysRemaining(item);

              const recommendation =
                item.recommendation;

              return (
                <div
                  key={item.food_id}
                  className={`recommendation-card recommendation-${recommendation.type}`}
                >

                  <div className="recommendation-card-icon">
                    {recommendation.icon}
                  </div>

                  <div className="recommendation-card-content">

                    <div className="recommendation-card-top">

                      <div>
                        <h3>
                          {item.food_name}
                        </h3>

                        <span>
                          {item.category || "Food Product"}
                          {" • "}
                          Batch:{" "}
                          {item.batch_number || "—"}
                        </span>
                      </div>

                      <div className="recommendation-days">

                        {days === null
                          ? "No expiry date"
                          : days < 0
                          ? `${Math.abs(days)} days overdue`
                          : days === 0
                          ? "Expires today"
                          : `${days} days left`}

                      </div>

                    </div>

                    <h4>
                      {recommendation.title}
                    </h4>

                    <p>
                      {recommendation.message}
                    </p>

                  </div>

                </div>
              );
            })}

          </div>

        )}

      </div>

    </div>
  );
}

export default Recommendations;

