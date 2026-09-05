import React, { useState } from "react";
import "./Reports.css";

const foodReport = [
  {
    food: "Apple",
    emoji: "🍎",
    analyses: 18,
    fresh: 15,
    nearSpoilage: 2,
    spoiled: 1,
    averageScore: 91,
  },
  {
    food: "Banana",
    emoji: "🍌",
    analyses: 21,
    fresh: 14,
    nearSpoilage: 5,
    spoiled: 2,
    averageScore: 84,
  },
  {
    food: "Carrot",
    emoji: "🥕",
    analyses: 15,
    fresh: 13,
    nearSpoilage: 2,
    spoiled: 0,
    averageScore: 94,
  },
  {
    food: "Cucumber",
    emoji: "🥒",
    analyses: 17,
    fresh: 13,
    nearSpoilage: 3,
    spoiled: 1,
    averageScore: 88,
  },
  {
    food: "Strawberry",
    emoji: "🍓",
    analyses: 20,
    fresh: 11,
    nearSpoilage: 4,
    spoiled: 5,
    averageScore: 76,
  },
  {
    food: "Mango",
    emoji: "🥭",
    analyses: 16,
    fresh: 13,
    nearSpoilage: 2,
    spoiled: 1,
    averageScore: 90,
  },
];

const recentActivity = [
  {
    food: "Strawberry",
    emoji: "🍓",
    status: "Spoiled",
    score: 24,
    time: "Today, 10:15 AM",
  },
  {
    food: "Banana",
    emoji: "🍌",
    status: "Near Spoilage",
    score: 57,
    time: "Today, 9:42 AM",
  },
  {
    food: "Apple",
    emoji: "🍎",
    status: "Fresh",
    score: 94,
    time: "Today, 8:55 AM",
  },
  {
    food: "Cucumber",
    emoji: "🥒",
    status: "Fresh",
    score: 89,
    time: "Yesterday, 6:30 PM",
  },
  {
    food: "Carrot",
    emoji: "🥕",
    status: "Fresh",
    score: 96,
    time: "Yesterday, 4:20 PM",
  },
];

function Reports({ onBack }) {
  const [period, setPeriod] = useState("Last 30 Days");
  const [showAll, setShowAll] = useState(false);

  const totalAnalyses = foodReport.reduce(
    (sum, item) => sum + item.analyses,
    0
  );

  const totalFresh = foodReport.reduce(
    (sum, item) => sum + item.fresh,
    0
  );

  const totalNearSpoilage = foodReport.reduce(
    (sum, item) => sum + item.nearSpoilage,
    0
  );

  const totalSpoiled = foodReport.reduce(
    (sum, item) => sum + item.spoiled,
    0
  );

  const averageScore = Math.round(
    foodReport.reduce(
      (sum, item) => sum + item.averageScore,
      0
    ) / foodReport.length
  );

  const freshPercentage = Math.round(
    (totalFresh / totalAnalyses) * 100
  );

  const visibleActivity = showAll
    ? recentActivity
    : recentActivity.slice(0, 4);

  const handleGenerateReport = () => {
    alert(
      `Report generated successfully for ${period}.`
    );
  };

  const getStatusClass = (status) => {
    if (status === "Fresh") return "report-fresh";
    if (status === "Near Spoilage")
      return "report-warning";
    return "report-spoiled";
  };

  return (
    <div className="reports-page">

      {/* HEADER */}
      <div className="reports-header">

        <div>
          <h1>Reports</h1>
          <p>
            Analyze food freshness trends and inventory
            performance
          </p>
        </div>

        <div className="reports-header-actions">

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Last 90 Days</option>
            <option>This Year</option>
          </select>

          <button
            className="generate-report-btn"
            onClick={handleGenerateReport}
          >
            ↓ Generate Report
          </button>

          {onBack && (
            <button
              className="reports-back-btn"
              onClick={onBack}
            >
              ← Dashboard
            </button>
          )}

        </div>

      </div>

      {/* SUMMARY */}
      <div className="reports-summary">

        <div className="report-stat-card">
          <div className="report-stat-icon blue">
            📊
          </div>

          <div>
            <span>Total Analyses</span>
            <strong>{totalAnalyses}</strong>
            <small>Food checks completed</small>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon green">
            ✓
          </div>

          <div>
            <span>Fresh Food</span>
            <strong>{totalFresh}</strong>
            <small>{freshPercentage}% of analyses</small>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon orange">
            ⚠
          </div>

          <div>
            <span>Near Spoilage</span>
            <strong>{totalNearSpoilage}</strong>
            <small>Needs attention</small>
          </div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-icon red">
            !
          </div>

          <div>
            <span>Spoiled</span>
            <strong>{totalSpoiled}</strong>
            <small>Requires action</small>
          </div>
        </div>

      </div>

      {/* SCORE OVERVIEW */}
      <div className="report-overview-grid">

        <div className="report-panel">

          <div className="report-panel-header">
            <div>
              <h2>Freshness Overview</h2>
              <p>
                Overall freshness performance
              </p>
            </div>

            <span className="report-period">
              {period}
            </span>
          </div>

          <div className="freshness-overview">

            <div className="score-circle">
              <div>
                <strong>{averageScore}</strong>
                <span>/100</span>
              </div>
            </div>

            <div className="score-info">

              <h3>Average Freshness Score</h3>

              <p>
                Your inventory is maintaining a good
                overall freshness level.
              </p>

              <div className="score-progress">

                <div className="score-progress-header">
                  <span>Freshness Performance</span>
                  <strong>{averageScore}%</strong>
                </div>

                <div className="score-progress-bar">
                  <div
                    style={{
                      width: `${averageScore}%`,
                    }}
                  ></div>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* QUICK INSIGHTS */}
        <div className="report-panel">

          <div className="report-panel-header">
            <div>
              <h2>Quick Insights</h2>
              <p>
                Important observations
              </p>
            </div>
          </div>

          <div className="insight-list">

            <div className="insight-item">
              <span className="insight-icon green">
                ✓
              </span>

              <div>
                <strong>
                  Freshness is performing well
                </strong>
                <p>
                  {freshPercentage}% of analyzed food
                  is currently fresh.
                </p>
              </div>
            </div>

            <div className="insight-item">
              <span className="insight-icon orange">
                ⚠
              </span>

              <div>
                <strong>
                  Some food needs attention
                </strong>
                <p>
                  {totalNearSpoilage} items are approaching
                  spoilage.
                </p>
              </div>
            </div>

            <div className="insight-item">
              <span className="insight-icon red">
                !
              </span>

              <div>
                <strong>
                  Spoilage detected
                </strong>
                <p>
                  {totalSpoiled} analyzed items were
                  identified as spoiled.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* FOOD PERFORMANCE */}
      <div className="report-panel food-performance-panel">

        <div className="report-panel-header">

          <div>
            <h2>Food Performance</h2>
            <p>
              Freshness statistics by food category
            </p>
          </div>

        </div>

        <div className="food-report-table-wrapper">

          <table className="food-report-table">

            <thead>
              <tr>
                <th>Food</th>
                <th>Analyses</th>
                <th>Fresh</th>
                <th>Near Spoilage</th>
                <th>Spoiled</th>
                <th>Average Score</th>
              </tr>
            </thead>

            <tbody>

              {foodReport.map((item) => (
                <tr key={item.food}>

                  <td>
                    <div className="report-food-name">
                      <span>{item.emoji}</span>
                      <strong>{item.food}</strong>
                    </div>
                  </td>

                  <td>{item.analyses}</td>

                  <td>
                    <span className="table-green">
                      {item.fresh}
                    </span>
                  </td>

                  <td>
                    <span className="table-orange">
                      {item.nearSpoilage}
                    </span>
                  </td>

                  <td>
                    <span className="table-red">
                      {item.spoiled}
                    </span>
                  </td>

                  <td>
                    <div className="table-score">

                      <div className="mini-score-bar">
                        <div
                          style={{
                            width: `${item.averageScore}%`,
                          }}
                        ></div>
                      </div>

                      <strong>
                        {item.averageScore}
                      </strong>

                    </div>
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>

      {/* RECENT ACTIVITY */}
      <div className="report-panel recent-report-panel">

        <div className="report-panel-header">

          <div>
            <h2>Recent Analysis Activity</h2>
            <p>
              Latest food freshness analyses
            </p>
          </div>

          <button
            className="view-all-report-btn"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show Less" : "View All"}
          </button>

        </div>

        <div className="recent-activity-list">

          {visibleActivity.map((item, index) => (
            <div
              className="recent-activity-item"
              key={index}
            >

              <div className="recent-food-icon">
                {item.emoji}
              </div>

              <div className="recent-food-details">
                <strong>{item.food}</strong>
                <span>{item.time}</span>
              </div>

              <span
                className={`recent-status ${getStatusClass(
                  item.status
                )}`}
              >
                {item.status}
              </span>

              <div className="recent-score">
                <span>Score</span>
                <strong>{item.score}/100</strong>
              </div>

            </div>
          ))}

        </div>

      </div>

      {/* FOOTER INFO */}
      <div className="report-footer-card">

        <div className="report-footer-icon">
          📈
        </div>

        <div>
          <h3>Keep Improving Your Food Management</h3>

          <p>
            Regular freshness analysis can help identify
            food nearing spoilage and reduce unnecessary
            waste.
          </p>
        </div>

        <button onClick={handleGenerateReport}>
          Generate Detailed Report →
        </button>

      </div>

    </div>
  );
}

export default Reports;