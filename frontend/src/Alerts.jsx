import React, { useState } from "react";
import "./Alerts.css";

const initialAlerts = [
  {
    id: 1,
    food: "Strawberry",
    emoji: "🍓",
    batch: "STR-005",
    type: "Spoiled",
    severity: "Critical",
    title: "Food Spoilage Detected",
    message:
      "Strawberry batch STR-005 has been identified as spoiled. Remove it from usable inventory immediately.",
    time: "10 minutes ago",
    unread: true,
  },
  {
    id: 2,
    food: "Banana",
    emoji: "🍌",
    batch: "BAN-002",
    type: "Near Spoilage",
    severity: "High",
    title: "Banana Near Spoilage",
    message:
      "Banana batch BAN-002 is approaching its estimated spoilage period. Consider using it soon.",
    time: "35 minutes ago",
    unread: true,
  },
  {
    id: 3,
    food: "Cucumber",
    emoji: "🥒",
    batch: "CUC-004",
    type: "Shelf Life",
    severity: "Medium",
    title: "Shelf Life Getting Short",
    message:
      "Cucumber batch CUC-004 has limited remaining shelf life. Monitor the batch regularly.",
    time: "1 hour ago",
    unread: true,
  },
  {
    id: 4,
    food: "Mango",
    emoji: "🥭",
    batch: "MAN-006",
    type: "Monitoring",
    severity: "Medium",
    title: "Freshness Monitoring Required",
    message:
      "Mango batch MAN-006 should be checked again soon to confirm its freshness status.",
    time: "2 hours ago",
    unread: false,
  },
  {
    id: 5,
    food: "Apple",
    emoji: "🍎",
    batch: "APL-001",
    type: "Storage",
    severity: "Low",
    title: "Storage Recommendation",
    message:
      "Store apples in a cool and dry environment to extend their freshness.",
    time: "3 hours ago",
    unread: false,
  },
  {
    id: 6,
    food: "Carrot",
    emoji: "🥕",
    batch: "CAR-003",
    type: "Monitoring",
    severity: "Low",
    title: "Routine Monitoring",
    message:
      "Carrot batch CAR-003 is currently fresh. Continue regular freshness checks.",
    time: "5 hours ago",
    unread: false,
  },
];

function Alerts({ onBack }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filter, setFilter] = useState("All");

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === "All") return true;
    if (filter === "Unread") return alert.unread;
    return alert.severity === filter;
  });

  const criticalCount = alerts.filter(
    (alert) => alert.severity === "Critical"
  ).length;

  const highCount = alerts.filter(
    (alert) => alert.severity === "High"
  ).length;

  const unreadCount = alerts.filter(
    (alert) => alert.unread
  ).length;

  const markAsRead = (id) => {
    setAlerts(
      alerts.map((alert) =>
        alert.id === id
          ? { ...alert, unread: false }
          : alert
      )
    );
  };

  const markAllAsRead = () => {
    setAlerts(
      alerts.map((alert) => ({
        ...alert,
        unread: false,
      }))
    );
  };

  const removeAlert = (id) => {
    setAlerts(
      alerts.filter((alert) => alert.id !== id)
    );
  };

  const getSeverityClass = (severity) => {
    if (severity === "Critical") return "alert-critical";
    if (severity === "High") return "alert-high";
    if (severity === "Medium") return "alert-medium";
    return "alert-low";
  };

  const getSeverityIcon = (severity) => {
    if (severity === "Critical") return "🚨";
    if (severity === "High") return "⚠️";
    if (severity === "Medium") return "🔔";
    return "💡";
  };

  return (
    <div className="alerts-page">

      {/* HEADER */}
      <div className="alerts-header">
        <div>
          <h1>Alerts</h1>
          <p>
            Monitor freshness issues and important food
            inventory events
          </p>
        </div>

        <div className="alerts-header-actions">
          <button
            className="mark-all-btn"
            onClick={markAllAsRead}
          >
            ✓ Mark All Read
          </button>

          {onBack && (
            <button
              className="alerts-back-btn"
              onClick={onBack}
            >
              ← Dashboard
            </button>
          )}
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="alerts-summary">

        <div className="alert-summary-card">
          <div className="alert-summary-icon total">
            🔔
          </div>

          <div>
            <span>Total Alerts</span>
            <strong>{alerts.length}</strong>
          </div>
        </div>

        <div className="alert-summary-card">
          <div className="alert-summary-icon critical">
            🚨
          </div>

          <div>
            <span>Critical</span>
            <strong>{criticalCount}</strong>
          </div>
        </div>

        <div className="alert-summary-card">
          <div className="alert-summary-icon high">
            ⚠️
          </div>

          <div>
            <span>High Priority</span>
            <strong>{highCount}</strong>
          </div>
        </div>

        <div className="alert-summary-card">
          <div className="alert-summary-icon unread">
            ●
          </div>

          <div>
            <span>Unread</span>
            <strong>{unreadCount}</strong>
          </div>
        </div>

      </div>

      {/* ALERT LIST */}
      <div className="alerts-container">

        <div className="alerts-list-header">

          <div>
            <h2>Recent Alerts</h2>
            <p>
              Important events detected by the system
            </p>
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="All">All Alerts</option>
            <option value="Unread">Unread</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

        </div>

        <div className="alerts-list">

          {filteredAlerts.length === 0 ? (
            <div className="alerts-empty">
              <div>🎉</div>
              <h3>No alerts found</h3>
              <p>
                There are no alerts matching the selected filter.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                className={`alert-item ${
                  alert.unread ? "alert-unread" : ""
                }`}
                key={alert.id}
              >

                {/* ICON */}
                <div
                  className={`alert-main-icon ${getSeverityClass(
                    alert.severity
                  )}`}
                >
                  {alert.emoji}
                </div>

                {/* CONTENT */}
                <div className="alert-content">

                  <div className="alert-title-row">

                    <div>
                      <h3>{alert.title}</h3>

                      <div className="alert-meta">

                        <span>
                          {alert.food}
                        </span>

                        <span>
                          Batch: {alert.batch}
                        </span>

                        <span
                          className={`alert-severity-badge ${getSeverityClass(
                            alert.severity
                          )}`}
                        >
                          {getSeverityIcon(alert.severity)}{" "}
                          {alert.severity}
                        </span>

                      </div>
                    </div>

                    {alert.unread && (
                      <span className="unread-dot">
                        New
                      </span>
                    )}

                  </div>

                  <p className="alert-message">
                    {alert.message}
                  </p>

                  <div className="alert-bottom">

                    <span className="alert-time">
                      🕒 {alert.time}
                    </span>

                    <div className="alert-actions">

                      {alert.unread && (
                        <button
                          className="read-btn"
                          onClick={() =>
                            markAsRead(alert.id)
                          }
                        >
                          ✓ Mark Read
                        </button>
                      )}

                      <button
                        className="dismiss-alert-btn"
                        onClick={() =>
                          removeAlert(alert.id)
                        }
                      >
                        Dismiss
                      </button>

                    </div>

                  </div>

                </div>

              </div>
            ))
          )}

        </div>
      </div>

      {/* ALERT GUIDELINES */}
      <div className="alert-guidelines">

        <div className="guideline-header">
          <span>🛡️</span>

          <div>
            <h2>Alert Priority Guide</h2>
            <p>
              Understand what each alert level means
            </p>
          </div>
        </div>

        <div className="guideline-grid">

          <div className="guideline-item">
            <div className="guideline-icon critical">
              🚨
            </div>

            <div>
              <strong>Critical</strong>
              <p>
                Immediate action required. Food may be
                spoiled or unsafe.
              </p>
            </div>
          </div>

          <div className="guideline-item">
            <div className="guideline-icon high">
              ⚠️
            </div>

            <div>
              <strong>High</strong>
              <p>
                Food is approaching spoilage and should
                be used soon.
              </p>
            </div>
          </div>

          <div className="guideline-item">
            <div className="guideline-icon medium">
              🔔
            </div>

            <div>
              <strong>Medium</strong>
              <p>
                Monitoring or storage action is
                recommended.
              </p>
            </div>
          </div>

          <div className="guideline-item">
            <div className="guideline-icon low">
              💡
            </div>

            <div>
              <strong>Low</strong>
              <p>
                Informational recommendation with no
                immediate action required.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Alerts;