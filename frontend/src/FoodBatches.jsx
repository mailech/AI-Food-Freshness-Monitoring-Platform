import React, { useEffect, useState } from "react";
import "./FoodBatches.css";
const getFoodEmoji = (foodName) => {
  const emojiMap = {
    Apple: "🍎",
    Banana: "🍌",
    "Bell Pepper": "🫑",
    Carrot: "🥕",
    Cucumber: "🥒",
    Grape: "🍇",
    Grapes: "🍇",
    Guava: "🥝",
    Jujube: "🫐",
    Mango: "🥭",
    Orange: "🍊",
    Pomegranate: "❤️",
    Potato: "🥔",
    Strawberry: "🍓",
    Tomato: "🍅",
  };

  return emojiMap[foodName] || "📦";
};
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
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All Batches");
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBatch, setNewBatch] = useState({
    food: "",
    category: "Fruit",
    quantity: "",
    freshness: "Fresh",
    shelfLife: "",
    storageTemperature: "6",
    humidity: "65",
  });
    const fetchBatches = async () => {
    try {
      const token = localStorage.getItem("foodfresh_access_token");

      if (!token) {
        alert("Please login again.");
        return;
      }

      const response = await fetch(
        "http://127.0.0.1:8000/batches",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.message || data?.detail || "Failed to load batches"
        );
      }

      const formattedBatches = data.batches.map((item) => ({
        id: item.id,
        batchId: item.batch_id,
        food: item.food_name,
        emoji: getFoodEmoji(item.food_name),
        category: item.category,
        quantity: `${item.quantity} ${item.unit}`,
        freshness: item.freshness,
        shelfLife: item.shelf_life,
        status: item.status,
        storageTemperature: item.temperature,
        humidity: item.humidity,
        added: item.created_at
          ? new Date(item.created_at).toLocaleDateString()
          : "Recently",
      }));

      setBatches(formattedBatches);
    } catch (error) {
      console.error("Fetch batches error:", error);
      alert(error.message || "Failed to load batches.");
    } finally {
      setLoading(false);
    }
  };
    useEffect(() => {
    fetchBatches();
  }, []);

  const handleBatchChange = (e) => {
    setNewBatch({
      ...newBatch,
      [e.target.name]: e.target.value,
    });
  };

const handleAddBatch = async (e) => {
  e.preventDefault();

  if (!newBatch.food || !newBatch.quantity || !newBatch.shelfLife) {
    alert("Please fill Food, Quantity and Shelf Life.");
    return;
  }

  try {
    const token = localStorage.getItem("foodfresh_access_token");

    if (!token) {
      alert("Please login again.");
      return;
    }

    const formData = new FormData();

    formData.append("food_name", newBatch.food);
    formData.append("category", newBatch.category);
    formData.append("quantity", Number(newBatch.quantity));
    formData.append("unit", "kg");
    formData.append("freshness", newBatch.freshness);
    formData.append("shelf_life", newBatch.shelfLife);
    formData.append(
      "temperature",
      Number(newBatch.storageTemperature)
    );
    formData.append(
      "humidity",
      Number(newBatch.humidity)
    );

    const response = await fetch(
      "http://127.0.0.1:8000/batches",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data?.message ||
        data?.detail ||
        "Failed to create batch"
      );
    }

    alert("Food batch added successfully!");

    await fetchBatches();

    setNewBatch({
      food: "",
      category: "Fruit",
      quantity: "",
      freshness: "Fresh",
      shelfLife: "",
      storageTemperature: "6",
      humidity: "65",
    });

    setShowAddModal(false);

  } catch (error) {
    console.error("Add batch error:", error);
    alert(error.message || "Failed to add food batch.");
  }
};

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

const removeBatch = async (id) => {
  const confirmDelete = window.confirm(
    "Are you sure you want to remove this batch?"
  );

  if (!confirmDelete) return;

  try {
    const token = localStorage.getItem("foodfresh_access_token");

    if (!token) {
      alert("Please login again.");
      return;
    }

    const response = await fetch(
      `http://127.0.0.1:8000/batches/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data?.message ||
        data?.detail ||
        "Failed to delete batch"
      );
    }

    alert("Food batch deleted successfully!");

    await fetchBatches();

    setSelectedBatch(null);

  } catch (error) {
    console.error("Delete batch error:", error);
    alert(error.message || "Failed to delete batch.");
  }
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

          <button
  className="add-batch-btn"
          onClick={() => setShowAddModal(true)}
        >
          + Add Batch
        </button>
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

      {/* Add Batch Modal */}
      {showAddModal && (
        <div
          className="batch-modal-overlay"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="batch-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="batch-modal-header">
              <div>
                <h2>+ Add Food Batch</h2>
                <p>Register a new batch for inventory tracking</p>
              </div>
              <button
                className="batch-modal-close"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddBatch}>
              <div className="form-row">
                <div className="form-group">
                  <label>Food Name *</label>
                  <input
                    name="food"
                    value={newBatch.food}
                    onChange={handleBatchChange}
                    placeholder="e.g. Mango"
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    name="category"
                    value={newBatch.category}
                    onChange={handleBatchChange}
                  >
                    <option>Fruit</option>
                    <option>Vegetable</option>
                    <option>Dairy</option>
                    <option>Meat & Poultry</option>
                    <option>Bakery Products</option>
                    <option>Packaged Foods</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity (kg) *</label>
                  <input
                    type="number"
                    name="quantity"
                    min="0"
                    value={newBatch.quantity}
                    onChange={handleBatchChange}
                  />
                </div>

                <div className="form-group">
                  <label>Freshness</label>
                  <select
                    name="freshness"
                    value={newBatch.freshness}
                    onChange={handleBatchChange}
                  >
                    <option>Fresh</option>
                    <option>Good</option>
                    <option>Acceptable</option>
                    <option>Near Spoilage</option>
                    <option>Spoiled</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Shelf Life *</label>
                  <input
                    name="shelfLife"
                    value={newBatch.shelfLife}
                    onChange={handleBatchChange}
                    placeholder="e.g. 5 Days"
                  />
                </div>

                <div className="form-group">
                  <label>Temperature (°C)</label>
                  <input
                    type="number"
                    name="storageTemperature"
                    value={newBatch.storageTemperature}
                    onChange={handleBatchChange}
                    step="0.1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Humidity (%)</label>
                <input
                  type="number"
                  name="humidity"
                  value={newBatch.humidity}
                  onChange={handleBatchChange}
                  min="0"
                  max="100"
                />
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="batch-modal-done"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="batch-modal-done">
                  + Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

              <div>
                <span>Temperature</span>
                <strong>{selectedBatch.storageTemperature ?? 6}°C</strong>
              </div>

              <div>
                <span>Humidity</span>
                <strong>{selectedBatch.humidity ?? 65}%</strong>
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