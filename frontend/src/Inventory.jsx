import React, { useMemo, useState } from "react";
import "./Inventory.css";

const initialInventory = [
  {
    id: 1,
    emoji: "🍎",
    name: "Apple",
    category: "Fruit",
    quantity: 80,
    unit: "kg",
    freshness: "Fresh",
    shelfLife: "7 Days",
    batch: "APL-001",
    lastAnalyzed: "Today",
  },
  {
    id: 2,
    emoji: "🍌",
    name: "Banana",
    category: "Fruit",
    quantity: 45,
    unit: "kg",
    freshness: "Near Spoilage",
    shelfLife: "1 Day",
    batch: "BAN-002",
    lastAnalyzed: "Today",
  },
  {
    id: 3,
    emoji: "🥕",
    name: "Carrot",
    category: "Vegetable",
    quantity: 60,
    unit: "kg",
    freshness: "Fresh",
    shelfLife: "5 Days",
    batch: "CAR-003",
    lastAnalyzed: "Yesterday",
  },
  {
    id: 4,
    emoji: "🥒",
    name: "Cucumber",
    category: "Vegetable",
    quantity: 35,
    unit: "kg",
    freshness: "Fresh",
    shelfLife: "4 Days",
    batch: "CUC-004",
    lastAnalyzed: "Today",
  },
  {
    id: 5,
    emoji: "🍓",
    name: "Strawberry",
    category: "Fruit",
    quantity: 20,
    unit: "kg",
    freshness: "Spoiled",
    shelfLife: "0 Days",
    batch: "STR-005",
    lastAnalyzed: "Yesterday",
  },
  {
    id: 6,
    emoji: "🥭",
    name: "Mango",
    category: "Fruit",
    quantity: 50,
    unit: "kg",
    freshness: "Fresh",
    shelfLife: "6 Days",
    batch: "MAN-006",
    lastAnalyzed: "Today",
  },
];

function Inventory({ onBack }) {
  const [inventory, setInventory] = useState(initialInventory);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [status, setStatus] = useState("All Status");

  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [newFood, setNewFood] = useState({
    name: "",
    category: "Fruit",
    quantity: "",
    unit: "kg",
    freshness: "Fresh",
    shelfLife: "",
    emoji: "🍎",
  });

  const stats = useMemo(() => {
    return {
      total: inventory.length,
      fresh: inventory.filter((item) => item.freshness === "Fresh").length,
      warning: inventory.filter(
        (item) => item.freshness === "Near Spoilage"
      ).length,
      spoiled: inventory.filter((item) => item.freshness === "Spoiled").length,
    };
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.batch.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        category === "All Categories" || item.category === category;

      const matchesStatus =
        status === "All Status" || item.freshness === status;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [inventory, search, category, status]);

  const handleInputChange = (e) => {
    setNewFood({
      ...newFood,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddFood = (e) => {
    e.preventDefault();

    if (!newFood.name || !newFood.quantity || !newFood.shelfLife) {
      alert("Please fill all required fields.");
      return;
    }

    const newItem = {
      id: Date.now(),
      emoji: newFood.emoji || "🍎",
      name: newFood.name,
      category: newFood.category,
      quantity: Number(newFood.quantity),
      unit: newFood.unit,
      freshness: newFood.freshness,
      shelfLife: newFood.shelfLife,
      batch: `${newFood.name.substring(0, 3).toUpperCase()}-${Date.now()
        .toString()
        .slice(-3)}`,
      lastAnalyzed: "Just now",
    };

    setInventory([newItem, ...inventory]);

    setNewFood({
      name: "",
      category: "Fruit",
      quantity: "",
      unit: "kg",
      freshness: "Fresh",
      shelfLife: "",
      emoji: "🍎",
    });

    setShowModal(false);
  };

  const handleDelete = (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to remove this item?"
    );

    if (confirmDelete) {
      setInventory(inventory.filter((item) => item.id !== id));
    }
  };

  const getStatusClass = (freshness) => {
    if (freshness === "Fresh") return "status-fresh";
    if (freshness === "Near Spoilage") return "status-warning";
    return "status-spoiled";
  };

  return (
    <div className="inventory-page">
      {/* Header */}
      <div className="inventory-header">
        <div>
          <h1>Inventory</h1>
          <p>Manage and monitor your food inventory</p>
        </div>

        <div className="inventory-header-buttons">
          {onBack && (
            <button className="inventory-back-btn" onClick={onBack}>
              ← Dashboard
            </button>
          )}

          <button
            className="inventory-add-btn"
            onClick={() => setShowModal(true)}
          >
            + Add Food
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="inventory-stats">
        <div className="inventory-stat-card">
          <div className="stat-icon total-icon">📦</div>
          <div>
            <span>Total Items</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="inventory-stat-card">
          <div className="stat-icon fresh-icon">✓</div>
          <div>
            <span>Fresh</span>
            <strong>{stats.fresh}</strong>
          </div>
        </div>

        <div className="inventory-stat-card">
          <div className="stat-icon warning-icon">⚠</div>
          <div>
            <span>Near Spoilage</span>
            <strong>{stats.warning}</strong>
          </div>
        </div>

        <div className="inventory-stat-card">
          <div className="stat-icon spoiled-icon">!</div>
          <div>
            <span>Spoiled</span>
            <strong>{stats.spoiled}</strong>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="inventory-toolbar">
        <div className="inventory-search">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search food or batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>All Categories</option>
          <option>Fruit</option>
          <option>Vegetable</option>
          <option>Dairy</option>
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>All Status</option>
          <option>Fresh</option>
          <option>Near Spoilage</option>
          <option>Spoiled</option>
        </select>
      </div>

      {/* Table */}
      <div className="inventory-table-container">
        <div className="inventory-table-header">
          <div>
            <h2>Food Inventory</h2>
            <p>{filteredInventory.length} items found</p>
          </div>
        </div>

        {filteredInventory.length === 0 ? (
          <div className="inventory-empty">
            <div>📦</div>
            <h3>No food items found</h3>
            <p>Try changing your search or filters.</p>
          </div>
        ) : (
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Food Item</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Freshness</th>
                  <th>Shelf Life</th>
                  <th>Batch</th>
                  <th>Last Analyzed</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="food-name-cell">
                        <span className="food-emoji">{item.emoji}</span>

                        <div>
                          <strong>{item.name}</strong>
                          <small>Food Item</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="category-badge">{item.category}</span>
                    </td>

                    <td>
                      <strong>
                        {item.quantity} {item.unit}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`freshness-status ${getStatusClass(
                          item.freshness
                        )}`}
                      >
                        <span className="status-dot"></span>
                        {item.freshness}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          item.shelfLife === "0 Days"
                            ? "shelf-danger"
                            : item.shelfLife === "1 Day"
                            ? "shelf-warning"
                            : "shelf-normal"
                        }
                      >
                        {item.shelfLife}
                      </span>
                    </td>

                    <td>
                      <span className="batch-code">{item.batch}</span>
                    </td>

                    <td>{item.lastAnalyzed}</td>

                    <td>
                      <div className="inventory-actions">
                        <button
                          className="view-btn"
                          onClick={() => setSelectedItem(item)}
                        >
                          View
                        </button>

                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Food Modal */}
      {showModal && (
        <div
          className="inventory-modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="inventory-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Add Food Item</h2>
                <p>Add a new item to your inventory</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddFood}>
              <div className="form-row">
                <div className="form-group">
                  <label>Food Name *</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Apple"
                    value={newFood.name}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Emoji</label>
                  <input
                    type="text"
                    name="emoji"
                    value={newFood.emoji}
                    onChange={handleInputChange}
                    maxLength="2"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    name="category"
                    value={newFood.category}
                    onChange={handleInputChange}
                  >
                    <option>Fruit</option>
                    <option>Vegetable</option>
                    <option>Dairy</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Freshness</label>
                  <select
                    name="freshness"
                    value={newFood.freshness}
                    onChange={handleInputChange}
                  >
                    <option>Fresh</option>
                    <option>Near Spoilage</option>
                    <option>Spoiled</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    placeholder="e.g. 25"
                    min="0"
                    value={newFood.quantity}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Unit</label>
                  <select
                    name="unit"
                    value={newFood.unit}
                    onChange={handleInputChange}
                  >
                    <option>kg</option>
                    <option>g</option>
                    <option>litres</option>
                    <option>units</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Shelf Life *</label>
                <input
                  type="text"
                  name="shelfLife"
                  placeholder="e.g. 5 Days"
                  value={newFood.shelfLife}
                  onChange={handleInputChange}
                />
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="modal-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="modal-submit">
                  + Add Food
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Item Modal */}
      {selectedItem && (
        <div
          className="inventory-modal-overlay"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="inventory-modal view-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>
                  {selectedItem.emoji} {selectedItem.name}
                </h2>
                <p>Inventory item details</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setSelectedItem(null)}
              >
                ×
              </button>
            </div>

            <div className="item-details">
              <div>
                <span>Category</span>
                <strong>{selectedItem.category}</strong>
              </div>

              <div>
                <span>Quantity</span>
                <strong>
                  {selectedItem.quantity} {selectedItem.unit}
                </strong>
              </div>

              <div>
                <span>Freshness</span>
                <strong>{selectedItem.freshness}</strong>
              </div>

              <div>
                <span>Shelf Life</span>
                <strong>{selectedItem.shelfLife}</strong>
              </div>

              <div>
                <span>Batch</span>
                <strong>{selectedItem.batch}</strong>
              </div>

              <div>
                <span>Last Analyzed</span>
                <strong>{selectedItem.lastAnalyzed}</strong>
              </div>
            </div>

            <button
              className="modal-submit full-width"
              onClick={() => setSelectedItem(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;