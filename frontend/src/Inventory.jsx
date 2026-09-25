import React, { useEffect, useMemo, useState } from "react";
import "./Inventory.css";
import EmojiPicker from "emoji-picker-react";

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

  return emojiMap[foodName] || "🍎";
};
  
  const Inventory = ({ onBack }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  

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
    storageTemperature: "6",
    humidity: "65",
    storageDuration: "0",
    airCirculation: "Good",
    lightExposure: "Low",
    packaging: "Proper",
    emoji: "🍎",
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem("foodfresh_access_token");

      const response = await fetch(
        "http://127.0.0.1:8000/inventory",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load inventory");
      }

      const data = await response.json();

      const formattedItems = data.items.map((item) => ({
        id: item.id,
        emoji: getFoodEmoji(item.food_name),
        name: item.food_name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        freshness: item.freshness || "Fresh",
        shelfLife: item.expiry_date
          ? calculateShelfLife(item.expiry_date)
          : "—",
        expiryDate: item.expiry_date || "—",
        batch: item.batch_id || "—",
        lastAnalyzed: item.created_at
          ? new Date(item.created_at).toLocaleDateString("en-IN")
          : "—",
        storageTemperature: item.temperature,
        humidity: item.humidity,
        storageDuration: item.storage_duration || 0,
        airCirculation: item.air_circulation,
        lightExposure: item.light_exposure,
        packaging: item.packaging,
      }));

      setInventory(formattedItems);
    } catch (error) {
      console.error("Inventory loading error:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateShelfLife = (expiryDate) => {
    const expiry = new Date(expiryDate);
    const today = new Date();

    const difference = Math.ceil(
      (expiry - today) / (1000 * 60 * 60 * 24)
    );

    if (difference <= 0) return "0 Days";
    if (difference === 1) return "1 Day";

    return `${difference} Days`;
  };
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
  const { name, value } = e.target;

  if (name === "name") {
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

    setNewFood({
      ...newFood,
      [name]: value,
      emoji: emojiMap[value] || "🍎",
    });

    return;
  }

  setNewFood({
    ...newFood,
    [name]: value,
  });
};

  const handleAddFood = async (e) => {
  e.preventDefault();

  if (!newFood.name || !newFood.quantity || !newFood.shelfLife) {
    alert("Please fill all required fields.");
    return;
  }

  try {
    const token = localStorage.getItem("foodfresh_access_token");

    if (!token) {
      alert("Please login again.");
      return;
    }

    // Calculate expiry date from shelf life
    const expiry = new Date();
    expiry.setDate(
      expiry.getDate() + Number(newFood.shelfLife)
    );

    const expiryDate = expiry.toISOString().split("T")[0];

    // Generate batch and tracking IDs
    const batchId = `${newFood.name
      .substring(0, 3)
      .toUpperCase()}-${Date.now()
      .toString()
      .slice(-3)}`;

    const trackingId = `TRK-${Date.now()
      .toString()
      .slice(-6)}`;

    const formData = new FormData();

    formData.append("food_name", newFood.name);
    formData.append("category", newFood.category);
    formData.append("quantity", Number(newFood.quantity));
    formData.append("unit", newFood.unit);
    formData.append("batch_id", batchId);
    formData.append("tracking_id", trackingId);
    formData.append("freshness", newFood.freshness);
    formData.append("expiry_date", expiryDate);
    formData.append(
      "temperature",
      Number(newFood.storageTemperature)
    );
    formData.append(
      "humidity",
      Number(newFood.humidity)
    );
    formData.append(
  "storage_duration",
  Number(newFood.storageDuration)
);
    formData.append(
      "air_circulation",
      newFood.airCirculation
    );
    formData.append(
      "light_exposure",
      newFood.lightExposure
    );
    formData.append(
      "packaging",
      newFood.packaging
    );

    const response = await fetch(
      "http://127.0.0.1:8000/inventory",
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
        "Failed to add inventory item"
      );
    }

    alert("Food added successfully!");

    // Reload inventory from PostgreSQL
    await fetchInventory();

    // Reset form
    setNewFood({
      name: "",
      category: "Fruit",
      quantity: "",
      unit: "kg",
      freshness: "Fresh",
      shelfLife: "",
      storageTemperature: "6",
      humidity: "65",
      storageDuration: "0",
      airCirculation: "Good",
      lightExposure: "Low",
      packaging: "Proper",
      emoji: "🍎",
    });

    setShowModal(false);

  } catch (error) {
    console.error("Add inventory error:", error);
    alert(error.message || "Failed to add food.");
  }
};

const handleDelete = async (id) => {
  const confirmDelete = window.confirm(
    "Are you sure you want to remove this item?"
  );

  if (!confirmDelete) {
    return;
  }

  try {
    const token = localStorage.getItem("foodfresh_access_token");

    if (!token) {
      alert("Please login again.");
      return;
    }

    const response = await fetch(
      `http://127.0.0.1:8000/inventory/${id}`,
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
        "Failed to delete inventory item"
      );
    }

    alert("Food deleted successfully!");

    // Reload inventory from PostgreSQL
    await fetchInventory();

  } catch (error) {
    console.error("Delete inventory error:", error);
    alert(error.message || "Failed to delete food.");
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
          <option>Meat & Poultry</option>
          <option>Seafood</option>
          <option>Bakery Products</option>
          <option>Packaged Foods</option>
          <option>Beverages</option>
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
                  <th>Expiry Date</th>
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
  <span className="batch-code">
    {item.expiryDate ?? "—"}
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

  <div className="emoji-picker-container">

    <button
      type="button"
      className="emoji-input-button"
      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
    >
      <span className="selected-emoji">
        {newFood.emoji || "😀"}
      </span>

      <span className="emoji-input-text">
        Choose emoji
      </span>
    </button>

    {showEmojiPicker && (
      <div className="emoji-picker-popup">
        <EmojiPicker
          onEmojiClick={(emojiData) => {
            setNewFood({
              ...newFood,
              emoji: emojiData.emoji,
            });

            setShowEmojiPicker(false);
          }}
          width={320}
          height={400}
        />
      </div>
    )}

  </div>
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
                    <option value="Fruit">Fruits</option>
                    <option value="Vegetable">Vegetables</option>
                    <option value="Dairy">Dairy Products</option>
                    <option value="Meat & Poultry">Meat & Poultry</option>
                    <option value="Seafood">Seafood</option>
                    <option value="Bakery Products">Bakery Products</option>
                    <option value="Packaged Foods">Packaged Foods</option>
                    <option value="Beverages">Beverages</option>
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
  type="number"
  name="shelfLife"
  placeholder="e.g. 5"
  min="1"
  value={newFood.shelfLife}
  onChange={handleInputChange}
/>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Temperature (°C)</label>
                  <input
                    type="number"
                    name="storageTemperature"
                    value={newFood.storageTemperature}
                    onChange={handleInputChange}
                    step="0.1"
                  />
                </div>

                <div className="form-group">
                  <label>Humidity (%)</label>
                  <input
                    type="number"
                    name="humidity"
                    value={newFood.humidity}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Storage Duration (Days)</label>
                  <input
                    type="number"
                    name="storageDuration"
                    value={newFood.storageDuration}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Air Circulation</label>
                  <select
                    name="airCirculation"
                    value={newFood.airCirculation}
                    onChange={handleInputChange}
                  >
                    <option>Good</option>
                    <option>Moderate</option>
                    <option>Poor</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Light Exposure</label>
                  <select
                    name="lightExposure"
                    value={newFood.lightExposure}
                    onChange={handleInputChange}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Packaging</label>
                  <select
                    name="packaging"
                    value={newFood.packaging}
                    onChange={handleInputChange}
                  >
                    <option>Proper</option>
                    <option>Open</option>
                    <option>Damaged</option>
                    <option>None</option>
                  </select>
                </div>
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
  <span>Expiry Date</span>
  <strong>
    {selectedItem.expiryDate ?? "Not available"}
  </strong>
</div>

              <div>
                <span>Batch</span>
                <strong>{selectedItem.batch}</strong>
              </div>

              <div>
                <span>Last Analyzed</span>
                <strong>{selectedItem.lastAnalyzed}</strong>
              </div>

              <div>
                <span>Temperature</span>
                <strong>{selectedItem.storageTemperature ?? 6}°C</strong>
              </div>

              <div>
                <span>Humidity</span>
                <strong>{selectedItem.humidity ?? 65}%</strong>
              </div>

              <div>
                <span>Storage Duration</span>
                <strong>{selectedItem.storageDuration ?? 0} Days</strong>
              </div>

              <div>
                <span>Air Circulation</span>
                <strong>{selectedItem.airCirculation ?? "Good"}</strong>
              </div>

              <div>
                <span>Light Exposure</span>
                <strong>{selectedItem.lightExposure ?? "Low"}</strong>
              </div>

              <div>
                <span>Packaging</span>
                <strong>{selectedItem.packaging ?? "Proper"}</strong>
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