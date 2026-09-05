import React, { useState } from "react";
import "./FoodBatches.css";

const initialBatches = [
  {
    id: 1,
    batchId: "APL-001",
    food: "Apple",
    emoji: "🍎",
    category: "Fruit",
    quantity: "80 kg",
    freshness: "Fresh",
    shelfLife: "7 Days",
    added: "Today",
    status: "Active",
  },
  {
    id: 2,
    batchId: "BAN-002",
    food: "Banana",
    emoji: "🍌",
    category: "Fruit",
    quantity: "45 kg",
    freshness: "Near Spoilage",
    shelfLife: "1 Day",
    added: "Today",
    status: "Priority",
  },
  {
    id: 3,
    batchId: "CAR-003",
    food: "Carrot",
    emoji: "🥕",
    category: "Vegetable",
    quantity: "60 kg",
    freshness: "Fresh",
    shelfLife: "5 Days",
    added: "Yesterday",
    status: "Active",
  },
  {
    id: 4,
    batchId: "CUC-004",
    food: "Cucumber",
    emoji: "🥒",
    category: "Vegetable",
    quantity: "35 kg",
    freshness: "Fresh",
    shelfLife: "4 Days",
    added: "Today",
    status: "Active",
  },
  {
    id: 5,
    batchId: "STR-005",
    food: "Strawberry",
    emoji: "🍓",
    category: "Fruit",
    quantity: "20 kg",
    freshness: "Spoiled",
    shelfLife: "0 Days",
    added: "Yesterday",
    status: "Expired",
  },
  {
    id: 6,
    batchId: "MAN-006",
    food: "Mango",
    emoji: "🥭",
    category: "Fruit",
    quantity: "50 kg",
    freshness: "Fresh",
    shelfLife: "6 Days",
    added: "Today",
    status: "Active",
  },
];

function FoodBatches({ onBack }) {
  const [batches, setBatches] = useState(initialBatches);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All Batches");
  const [selectedBatch, setSelectedBatch] = useState(null);

  const filteredBatches = batches.filter((batch) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      batch.food.toLowerCase().includes(searchText) ||
      batch.batchId.toLowerCase().includes(searchText);

    let matchesFilter = true;

    if (filter === "Active") {
      matchesFilter = batch.status === "Active";
    }

    if (filter === "Priority") {
      matchesFilter = batch.status === "Priority";
    }

    if (filter === "Expired") {
      matchesFilter = batch.status === "Expired";
    }

    return matchesSearch && matchesFilter;
  });

  const totalBatches = batches.length;
  const activeBatches = batches.filter(
    (batch) => batch.status === "Active"
  ).length;
  const priorityBatches = batches.filter(
    (batch) => batch.status === "Priority"
  ).length;
  const expiredBatches = batches.filter(
    (batch) => batch.status === "Expired"
  ).length;

  const getFreshnessClass = (freshness) => {
    if (freshness === "Fresh") return "batch-fresh";
    if (freshness === "Near Spoilage") return "batch-warning";
    return "batch-spoiled";
  };

  const getStatusClass = (status) => {
    if (status === "Active") return "batch-active";
    if (status === "Priority") return "batch-priority";
    return "batch-expired";
  };

  const removeBatch = (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to remove this batch?"
    );

    if (!confirmDelete) return;

    setBatches(batches.filter((batch) => batch.id !== id));
  };

  return (
    <div className="batches-page">
      {/* Header */}
      <div className="batches-header">
        <div>
          <h1>Food Batches</h1>
          <p>Track and manage individual food batches</p>
        </div>

        <div className="batches-header-actions">
          {onBack && (
            <button className="batches-back-btn" onClick={onBack}>
              ← Dashboard
            </button>
          )}

          <button className="add-batch-btn">+ Add Batch</button>
        </div>
      </div>

      {/* Statistics */}
      <div className="batch-stats">
        <div className="batch-stat-card">
          <div className="batch-stat-icon batch-total-icon">📦</div>

          <div>
            <span>Total Batches</span>
            <strong>{totalBatches}</strong>
          </div>
        </div>

        <div className="batch-stat-card">
          <div className="batch-stat-icon batch-active-icon">✓</div>

          <div>
            <span>Active</span>
            <strong>{activeBatches}</strong>
          </div>
        </div>

        <div className="batch-stat-card">
          <div className="batch-stat-icon batch-priority-icon">⚠</div>

          <div>
            <span>Priority</span>
            <strong>{priorityBatches}</strong>
          </div>
        </div>

        <div className="batch-stat-card">
          <div className="batch-stat-icon batch-expired-icon">!</div>

          <div>
            <span>Expired</span>
            <strong>{expiredBatches}</strong>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="batches-toolbar">
        <div className="batch-search">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Search batch or food..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option>All Batches</option>
          <option>Active</option>
          <option>Priority</option>
          <option>Expired</option>
        </select>
      </div>

      {/* Batch Cards */}
      <div className="batch-list">
        {filteredBatches.length === 0 ? (
          <div className="no-batches">
            <div>📦</div>
            <h3>No batches found</h3>
            <p>Try changing your search or filter.</p>
          </div>
        ) : (
          filteredBatches.map((batch) => (
            <div className="batch-card" key={batch.id}>
              {/* Card Top */}
              <div className="batch-card-top">
                <div className="batch-food-info">
                  <div className="batch-food-emoji">
                    {batch.emoji}
                  </div>

                  <div>
                    <h2>{batch.food}</h2>
                    <span>{batch.batchId}</span>
                  </div>
                </div>

                <span
                  className={`batch-status ${getStatusClass(
                    batch.status
                  )}`}
                >
                  {batch.status}
                </span>
              </div>

              {/* Details */}
              <div className="batch-details">
                <div>
                  <span>Category</span>
                  <strong>{batch.category}</strong>
                </div>

                <div>
                  <span>Quantity</span>
                  <strong>{batch.quantity}</strong>
                </div>

                <div>
                  <span>Freshness</span>

                  <strong
                    className={`batch-freshness ${getFreshnessClass(
                      batch.freshness
                    )}`}
                  >
                    {batch.freshness}
                  </strong>
                </div>

                <div>
                  <span>Shelf Life</span>
                  <strong>{batch.shelfLife}</strong>
                </div>

                <div>
                  <span>Added</span>
                  <strong>{batch.added}</strong>
                </div>
              </div>

              {/* Progress */}
              <div className="batch-progress-section">
                <div className="batch-progress-label">
                  <span>Freshness status</span>
                  <span>{batch.freshness}</span>
                </div>

                <div className="batch-progress">
                  <div
                    className={`batch-progress-bar ${getFreshnessClass(
                      batch.freshness
                    )}`}
                    style={{
                      width:
                        batch.freshness === "Fresh"
                          ? "85%"
                          : batch.freshness === "Near Spoilage"
                          ? "35%"
                          : "8%",
                    }}
                  ></div>
                </div>
              </div>

              {/* Actions */}
              <div className="batch-card-actions">
                <button
                  className="batch-view-btn"
                  onClick={() => setSelectedBatch(batch)}
                >
                  View Details
                </button>

                <button
                  className="batch-remove-btn"
                  onClick={() => removeBatch(batch.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {selectedBatch && (
        <div
          className="batch-modal-overlay"
          onClick={() => setSelectedBatch(null)}
        >
          <div
            className="batch-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="batch-modal-header">
              <div>
                <h2>
                  {selectedBatch.emoji} {selectedBatch.food}
                </h2>
                <p>Batch ID: {selectedBatch.batchId}</p>
              </div>

              <button
                className="batch-modal-close"
                onClick={() => setSelectedBatch(null)}
              >
                ×
              </button>
            </div>

            <div className="batch-modal-grid">
              <div>
                <span>Batch ID</span>
                <strong>{selectedBatch.batchId}</strong>
              </div>

              <div>
                <span>Category</span>
                <strong>{selectedBatch.category}</strong>
              </div>

              <div>
                <span>Quantity</span>
                <strong>{selectedBatch.quantity}</strong>
              </div>

              <div>
                <span>Freshness</span>
                <strong>{selectedBatch.freshness}</strong>
              </div>

              <div>
                <span>Shelf Life</span>
                <strong>{selectedBatch.shelfLife}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{selectedBatch.status}</strong>
              </div>

              <div>
                <span>Added</span>
                <strong>{selectedBatch.added}</strong>
              </div>
            </div>

            <button
              className="batch-modal-done"
              onClick={() => setSelectedBatch(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FoodBatches;