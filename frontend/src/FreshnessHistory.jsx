import React, { useState } from "react";
import "./FreshnessHistory.css";

const historyData = [
  {
    id: 1,
    food: "Apple",
    emoji: "🍎",
    batchId: "APL-001",
    freshness: "Fresh",
    score: 94,
    confidence: 98.4,
    shelfLife: "7 Days",
    date: "Today",
    time: "10:42 AM",
  },
  {
    id: 2,
    food: "Banana",
    emoji: "🍌",
    batchId: "BAN-002",
    freshness: "Near Spoilage",
    score: 42,
    confidence: 95.2,
    shelfLife: "1 Day",
    date: "Today",
    time: "09:35 AM",
  },
  {
    id: 3,
    food: "Carrot",
    emoji: "🥕",
    batchId: "CAR-003",
    freshness: "Fresh",
    score: 91,
    confidence: 97.1,
    shelfLife: "5 Days",
    date: "Today",
    time: "08:50 AM",
  },
  {
    id: 4,
    food: "Strawberry",
    emoji: "🍓",
    batchId: "STR-005",
    freshness: "Spoiled",
    score: 8,
    confidence: 96.7,
    shelfLife: "0 Days",
    date: "Yesterday",
    time: "06:25 PM",
  },
  {
    id: 5,
    food: "Cucumber",
    emoji: "🥒",
    batchId: "CUC-004",
    freshness: "Fresh",
    score: 88,
    confidence: 94.8,
    shelfLife: "4 Days",
    date: "Yesterday",
    time: "03:15 PM",
  },
  {
    id: 6,
    food: "Mango",
    emoji: "🥭",
    batchId: "MAN-006",
    freshness: "Fresh",
    score: 93,
    confidence: 97.5,
    shelfLife: "6 Days",
    date: "Yesterday",
    time: "11:20 AM",
  },
  {
    id: 7,
    food: "Tomato",
    emoji: "🍅",
    batchId: "TOM-007",
    freshness: "Near Spoilage",
    score: 38,
    confidence: 92.6,
    shelfLife: "1 Day",
    date: "Aug 30",
    time: "04:45 PM",
  },
  {
    id: 8,
    food: "Orange",
    emoji: "🍊",
    batchId: "ORG-008",
    freshness: "Fresh",
    score: 95,
    confidence: 98.1,
    shelfLife: "8 Days",
    date: "Aug 30",
    time: "12:10 PM",
  },
];

function FreshnessHistory({ onBack }) {
  const [history, setHistory] = useState(historyData);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedRecord, setSelectedRecord] = useState(null);

  const filteredHistory = history.filter((item) => {
    const searchValue = search.toLowerCase();

    const matchesSearch =
      item.food.toLowerCase().includes(searchValue) ||
      item.batchId.toLowerCase().includes(searchValue);

    const matchesFilter =
      filter === "All" || item.freshness === filter;

    return matchesSearch && matchesFilter;
  });

  const freshCount = history.filter(
    (item) => item.freshness === "Fresh"
  ).length;

  const warningCount = history.filter(
    (item) => item.freshness === "Near Spoilage"
  ).length;

  const spoiledCount = history.filter(
    (item) => item.freshness === "Spoiled"
  ).length;

  const averageScore = Math.round(
    history.reduce((total, item) => total + item.score, 0) /
      history.length
  );

  const getStatusClass = (status) => {
    if (status === "Fresh") return "history-fresh";
    if (status === "Near Spoilage") return "history-warning";
    return "history-spoiled";
  };

  const clearHistory = () => {
    const confirmClear = window.confirm(
      "Are you sure you want to clear the freshness history?"
    );

    if (confirmClear) {
      setHistory([]);
    }
  };

  return (
    <div className="freshness-history-page">

      {/* Header */}
      <div className="history-header">
        <div>
          <h1>Freshness History</h1>
          <p>
            Review previous food freshness analysis results
          </p>
        </div>

        <div className="history-header-actions">
          {onBack && (
            <button
              className="history-back-btn"
              onClick={onBack}
            >
              ← Dashboard
            </button>
          )}

          <button
            className="clear-history-btn"
            onClick={clearHistory}
            disabled={history.length === 0}
          >
            Clear History
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="history-stats">

        <div className="history-stat-card">
          <div className="history-stat-icon total">
            📊
          </div>

          <div>
            <span>Total Analyses</span>
            <strong>{history.length}</strong>
          </div>
        </div>

        <div className="history-stat-card">
          <div className="history-stat-icon fresh">
            ✓
          </div>

          <div>
            <span>Fresh</span>
            <strong>{freshCount}</strong>
          </div>
        </div>

        <div className="history-stat-card">
          <div className="history-stat-icon warning">
            ⚠
          </div>

          <div>
            <span>Near Spoilage</span>
            <strong>{warningCount}</strong>
          </div>
        </div>

        <div className="history-stat-card">
          <div className="history-stat-icon spoiled">
            !
          </div>

          <div>
            <span>Spoiled</span>
            <strong>{spoiledCount}</strong>
          </div>
        </div>

        <div className="history-stat-card">
          <div className="history-stat-icon score">
            ★
          </div>

          <div>
            <span>Average Score</span>
            <strong>{history.length ? averageScore : 0}%</strong>
          </div>
        </div>

      </div>

      {/* Toolbar */}
      <div className="history-toolbar">

        <div className="history-search">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Search food or batch ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="All">All Results</option>
          <option value="Fresh">Fresh</option>
          <option value="Near Spoilage">
            Near Spoilage
          </option>
          <option value="Spoiled">Spoiled</option>
        </select>

      </div>

      {/* History Table */}
      <div className="history-table-container">

        {filteredHistory.length === 0 ? (
          <div className="history-empty">
            <div>📋</div>
            <h3>No analysis history found</h3>
            <p>
              Your food freshness analysis results will
              appear here.
            </p>
          </div>
        ) : (
          <table className="history-table">

            <thead>
              <tr>
                <th>Food</th>
                <th>Batch ID</th>
                <th>Freshness</th>
                <th>Score</th>
                <th>Confidence</th>
                <th>Shelf Life</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredHistory.map((item) => (
                <tr key={item.id}>

                  <td>
                    <div className="history-food">
                      <div className="history-food-icon">
                        {item.emoji}
                      </div>

                      <div>
                        <strong>{item.food}</strong>
                        <span>{item.time}</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className="history-batch-id">
                      {item.batchId}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`history-status ${getStatusClass(
                        item.freshness
                      )}`}
                    >
                      {item.freshness}
                    </span>
                  </td>

                  <td>
                    <div className="score-wrapper">
                      <div className="score-bar">
                        <div
                          className={`score-fill ${getStatusClass(
                            item.freshness
                          )}`}
                          style={{
                            width: `${item.score}%`,
                          }}
                        ></div>
                      </div>

                      <strong>{item.score}%</strong>
                    </div>
                  </td>

                  <td>
                    <strong>{item.confidence}%</strong>
                  </td>

                  <td>
                    <strong>{item.shelfLife}</strong>
                  </td>

                  <td>
                    <span className="history-date">
                      {item.date}
                    </span>
                  </td>

                  <td>
                    <button
                      className="history-view-btn"
                      onClick={() =>
                        setSelectedRecord(item)
                      }
                    >
                      View
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>

          </table>
        )}

      </div>

      {/* Details Modal */}
      {selectedRecord && (
        <div
          className="history-modal-overlay"
          onClick={() => setSelectedRecord(null)}
        >

          <div
            className="history-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="history-modal-header">

              <div>
                <h2>
                  {selectedRecord.emoji}{" "}
                  {selectedRecord.food}
                </h2>

                <p>
                  Analysis performed on{" "}
                  {selectedRecord.date} at{" "}
                  {selectedRecord.time}
                </p>
              </div>

              <button
                className="history-close-btn"
                onClick={() => setSelectedRecord(null)}
              >
                ×
              </button>

            </div>

            <div className="history-result-box">

              <div className="history-result-main">
                <span>Freshness Score</span>
                <strong>
                  {selectedRecord.score}%
                </strong>
              </div>

              <span
                className={`history-status ${getStatusClass(
                  selectedRecord.freshness
                )}`}
              >
                {selectedRecord.freshness}
              </span>

            </div>

            <div className="history-modal-grid">

              <div>
                <span>Batch ID</span>
                <strong>
                  {selectedRecord.batchId}
                </strong>
              </div>

              <div>
                <span>Confidence</span>
                <strong>
                  {selectedRecord.confidence}%
                </strong>
              </div>

              <div>
                <span>Shelf Life</span>
                <strong>
                  {selectedRecord.shelfLife}
                </strong>
              </div>

              <div>
                <span>Analysis Date</span>
                <strong>
                  {selectedRecord.date}
                </strong>
              </div>

              <div>
                <span>Analysis Time</span>
                <strong>
                  {selectedRecord.time}
                </strong>
              </div>

              <div>
                <span>Food Category</span>
                <strong>
                  {[
                    "Apple",
                    "Banana",
                    "Strawberry",
                    "Mango",
                    "Orange",
                  ].includes(selectedRecord.food)
                    ? "Fruit"
                    : "Vegetable"}
                </strong>
              </div>

            </div>

            <button
              className="history-modal-done"
              onClick={() => setSelectedRecord(null)}
            >
              Close
            </button>

          </div>

        </div>
      )}

    </div>
  );
}

export default FreshnessHistory;