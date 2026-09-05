import React, { useState } from "react";
import "./Recommendations.css";

const recommendationData = [
  {
    id: 1,
    food: "Banana",
    emoji: "🍌",
    status: "Near Spoilage",
    priority: "High",
    title: "Use Banana Soon",
    message:
      "This batch is approaching spoilage. Consider consuming or processing it within 1 day.",
    action: "Consume within 1 day",
    category: "Food Usage",
  },
  {
    id: 2,
    food: "Strawberry",
    emoji: "🍓",
    status: "Spoiled",
    priority: "Critical",
    title: "Remove Spoiled Strawberry",
    message:
      "The freshness analysis indicates that this batch is spoiled. Remove it from usable inventory.",
    action: "Remove from inventory",
    category: "Safety",
  },
  {
    id: 3,
    food: "Apple",
    emoji: "🍎",
    status: "Fresh",
    priority: "Low",
    title: "Store Apples Properly",
    message:
      "The apples are fresh. Keep them in a cool and dry storage area to maintain freshness.",
    action: "Store in cool area",
    category: "Storage",
  },
  {
    id: 4,
    food: "Carrot",
    emoji: "🥕",
    status: "Fresh",
    priority: "Low",
    title: "Maintain Refrigeration",
    message:
      "Carrots are currently fresh. Refrigerated storage can help maintain their quality.",
    action: "Keep refrigerated",
    category: "Storage",
  },
  {
    id: 5,
    food: "Cucumber",
    emoji: "🥒",
    status: "Fresh",
    priority: "Medium",
    title: "Monitor Cucumber",
    message:
      "The cucumber is fresh but should be monitored regularly as its estimated shelf life is limited.",
    action: "Check again in 2 days",
    category: "Monitoring",
  },
  {
    id: 6,
    food: "Mango",
    emoji: "🥭",
    status: "Fresh",
    priority: "Low",
    title: "Continue Normal Storage",
    message:
      "Mangoes are currently in good condition. Continue normal storage practices.",
    action: "Continue storage",
    category: "Storage",
  },
];

const storageTips = [
  {
    emoji: "🌡️",
    title: "Maintain Proper Temperature",
    text: "Keep perishable foods at suitable storage temperatures.",
  },
  {
    emoji: "💧",
    title: "Control Moisture",
    text: "Excess moisture can accelerate deterioration and mold growth.",
  },
  {
    emoji: "📦",
    title: "Avoid Overcrowding",
    text: "Allow sufficient air circulation around stored food.",
  },
  {
    emoji: "🔄",
    title: "Follow FIFO",
    text: "Use older food batches before newer batches.",
  },
];

function Recommendations({ onBack }) {
  const [recommendations, setRecommendations] =
    useState(recommendationData);

  const [filter, setFilter] = useState("All");

  const [completed, setCompleted] = useState([]);

  const filteredRecommendations = recommendations.filter(
    (item) => filter === "All" || item.priority === filter
  );

  const highPriority = recommendations.filter(
    (item) => item.priority === "High"
  ).length;

  const criticalPriority = recommendations.filter(
    (item) => item.priority === "Critical"
  ).length;

  const completedCount = completed.length;

  const markCompleted = (id) => {
    if (!completed.includes(id)) {
      setCompleted([...completed, id]);
    }
  };

  const removeRecommendation = (id) => {
    setRecommendations(
      recommendations.filter((item) => item.id !== id)
    );

    setCompleted(
      completed.filter((itemId) => itemId !== id)
    );
  };

  const getPriorityClass = (priority) => {
    if (priority === "Critical") return "recommendation-critical";
    if (priority === "High") return "recommendation-high";
    if (priority === "Medium") return "recommendation-medium";
    return "recommendation-low";
  };

  const getStatusClass = (status) => {
    if (status === "Fresh") return "recommendation-fresh";
    if (status === "Near Spoilage")
      return "recommendation-warning";
    return "recommendation-spoiled";
  };

  return (
    <div className="recommendations-page">

      {/* HEADER */}
      <div className="recommendations-header">
        <div>
          <h1>Recommendations</h1>
          <p>
            Smart suggestions to reduce food waste and
            maintain freshness
          </p>
        </div>

        {onBack && (
          <button
            className="recommendations-back-btn"
            onClick={onBack}
          >
            ← Dashboard
          </button>
        )}
      </div>

      {/* SUMMARY */}
      <div className="recommendation-summary">

        <div className="recommendation-summary-card">
          <div className="recommendation-summary-icon">
            💡
          </div>

          <div>
            <span>Total Recommendations</span>
            <strong>{recommendations.length}</strong>
          </div>
        </div>

        <div className="recommendation-summary-card">
          <div className="recommendation-summary-icon high">
            ⚠
          </div>

          <div>
            <span>High Priority</span>
            <strong>{highPriority}</strong>
          </div>
        </div>

        <div className="recommendation-summary-card">
          <div className="recommendation-summary-icon critical">
            !
          </div>

          <div>
            <span>Critical</span>
            <strong>{criticalPriority}</strong>
          </div>
        </div>

        <div className="recommendation-summary-card">
          <div className="recommendation-summary-icon completed">
            ✓
          </div>

          <div>
            <span>Completed</span>
            <strong>{completedCount}</strong>
          </div>
        </div>

      </div>

      {/* MAIN CONTENT */}
      <div className="recommendations-layout">

        {/* LEFT */}
        <div className="recommendations-main">

          <div className="recommendations-section-header">
            <div>
              <h2>Smart Recommendations</h2>
              <p>
                Based on current freshness analysis
              </p>
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="recommendation-list">

            {filteredRecommendations.length === 0 ? (
              <div className="recommendation-empty">
                <div>🎉</div>
                <h3>No recommendations</h3>
                <p>
                  Everything looks good right now.
                </p>
              </div>
            ) : (
              filteredRecommendations.map((item) => {
                const isCompleted =
                  completed.includes(item.id);

                return (
                  <div
                    className={`recommendation-card ${
                      isCompleted
                        ? "recommendation-completed-card"
                        : ""
                    }`}
                    key={item.id}
                  >

                    {/* TOP */}
                    <div className="recommendation-card-top">

                      <div className="recommendation-food">

                        <div className="recommendation-food-icon">
                          {item.emoji}
                        </div>

                        <div>
                          <h3>{item.title}</h3>

                          <div className="recommendation-meta">
                            <span>{item.food}</span>

                            <span
                              className={`recommendation-status ${getStatusClass(
                                item.status
                              )}`}
                            >
                              {item.status}
                            </span>
                          </div>
                        </div>

                      </div>

                      <span
                        className={`recommendation-priority ${getPriorityClass(
                          item.priority
                        )}`}
                      >
                        {item.priority}
                      </span>

                    </div>

                    {/* MESSAGE */}
                    <p className="recommendation-message">
                      {item.message}
                    </p>

                    {/* ACTION */}
                    <div className="recommendation-action">

                      <div>
                        <span>Recommended Action</span>
                        <strong>{item.action}</strong>
                      </div>

                      <div className="recommendation-buttons">

                        <button
                          className={
                            isCompleted
                              ? "recommendation-done"
                              : "recommendation-complete"
                          }
                          onClick={() =>
                            markCompleted(item.id)
                          }
                          disabled={isCompleted}
                        >
                          {isCompleted
                            ? "✓ Completed"
                            : "Mark Done"}
                        </button>

                        <button
                          className="recommendation-dismiss"
                          onClick={() =>
                            removeRecommendation(item.id)
                          }
                        >
                          Dismiss
                        </button>

                      </div>

                    </div>

                  </div>
                );
              })
            )}

          </div>
        </div>

        {/* RIGHT */}
        <div className="recommendations-sidebar">

          {/* Waste Reduction */}
          <div className="recommendation-side-card">

            <div className="side-card-title">
              <span>♻️</span>
              <div>
                <h3>Waste Reduction</h3>
                <p>Improve food utilization</p>
              </div>
            </div>

            <div className="waste-progress">

              <div className="waste-progress-header">
                <span>Estimated efficiency</span>
                <strong>82%</strong>
              </div>

              <div className="waste-progress-bar">
                <div
                  className="waste-progress-fill"
                  style={{ width: "82%" }}
                ></div>
              </div>

            </div>

            <p className="waste-message">
              Good progress! Prioritize foods with short
              remaining shelf life to reduce waste.
            </p>

          </div>

          {/* Storage Tips */}
          <div className="recommendation-side-card">

            <div className="side-card-title">
              <span>📌</span>

              <div>
                <h3>Storage Tips</h3>
                <p>Simple ways to preserve freshness</p>
              </div>
            </div>

            <div className="storage-tips">

              {storageTips.map((tip, index) => (
                <div
                  className="storage-tip"
                  key={index}
                >
                  <div className="storage-tip-icon">
                    {tip.emoji}
                  </div>

                  <div>
                    <strong>{tip.title}</strong>
                    <p>{tip.text}</p>
                  </div>
                </div>
              ))}

            </div>

          </div>

          {/* FIFO */}
          <div className="fifo-card">

            <div className="fifo-icon">🔄</div>

            <div>
              <h3>FIFO Recommendation</h3>

              <p>
                Use the oldest food batches first to
                minimize unnecessary waste.
              </p>

              <button>
                View Food Batches →
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Recommendations;