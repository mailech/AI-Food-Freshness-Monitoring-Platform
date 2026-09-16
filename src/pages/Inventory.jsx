import { useEffect, useState } from "react";

function Inventory() {
  const [formData, setFormData] = useState({
    food_name: "",
    category: "Fruits",
    quantity: "",
    batch_number: "",
    purchase_date: "",
    expiry_date: "",
  });

  const [foodItems, setFoodItems] = useState([]);
  const [error, setError] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [editingItem, setEditingItem] = useState(null);
const [showDeletePopup, setShowDeletePopup] = useState(false);
const [itemToDelete, setItemToDelete] = useState(null);

  // =========================
  // FETCH INVENTORY
  // =========================

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

  // =========================
  // DATE
  // =========================

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // =========================
  // INVENTORY ANALYSIS
  // =========================

  const getItemStatus = (item) => {
    if (!item.expiry_date) {
      return "Active";
    }

    const expiry = new Date(item.expiry_date);
    expiry.setHours(0, 0, 0, 0);

    const difference =
      (expiry - today) /
      (1000 * 60 * 60 * 24);

    if (difference < 0) {
      return "Expired";
    }

    if (difference <= 7) {
      return "Expiring Soon";
    }

    return "Active";
  };

  // =========================
// DAYS REMAINING
// =========================

const getDaysRemaining = (item) => {
  if (!item.expiry_date) {
    return null;
  }

  const expiry = new Date(item.expiry_date);
  expiry.setHours(0, 0, 0, 0);

  const difference =
    (expiry - today) /
    (1000 * 60 * 60 * 24);

  return Math.ceil(difference);
};

// =========================
// PRODUCT PRIORITY
// =========================

const getItemPriority = (item) => {
  const days = getDaysRemaining(item);

  if (days === null) {
    return "Normal";
  }

  if (days <= 0) {
    return "Sell First";
  }

  if (days <= 3) {
    return "High Priority";
  }

  if (days <= 7) {
    return "Medium Priority";
  }

  return "Normal";
};
  const totalProducts = foodItems.length;

  const totalQuantity = foodItems.reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0
  );

  const expiredProducts = foodItems.filter(
    (item) => getItemStatus(item) === "Expired"
  ).length;

  const expiringSoonProducts = foodItems.filter(
    (item) => getItemStatus(item) === "Expiring Soon"
  ).length;

  // =========================
  // FORM HANDLING
  // =========================

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // =========================
  // ADD FOOD ITEM
  // =========================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(
        "http://127.0.0.1:8000/food/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...formData,
            quantity: Number(formData.quantity),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to add food item."
        );
      }

      setFoodItems((currentItems) => [
        ...currentItems,
        {
          food_id: data.food_id,
          food_name: data.food_name,
          category: data.category,
          quantity: data.quantity,
          batch_number: data.batch_number,
          purchase_date: data.purchase_date,
          expiry_date: data.expiry_date,
        },
      ]);

      setShowSuccessPopup(true);

      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 2500);

      setFormData({
        food_name: "",
        category: "Fruits",
        quantity: "",
        batch_number: "",
        purchase_date: "",
        expiry_date: "",
      });

    } catch (err) {
      setError(err.message);
    }
  };

  // =========================
// EDIT FOOD ITEM
// =========================

const handleEdit = (item) => {
  setEditingItem(item);

  setFormData({
    food_name: item.food_name || "",
    category: item.category || "Fruits",
    quantity: item.quantity || "",
    batch_number: item.batch_number || "",
    purchase_date: item.purchase_date || "",
    expiry_date: item.expiry_date || "",
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

const handleUpdate = async (e) => {
  e.preventDefault();

  setError("");

  try {
    const token = localStorage.getItem("access_token");

    const response = await fetch(
      `http://127.0.0.1:8000/food/${editingItem.food_id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Failed to update food item."
      );
    }

    setFoodItems((currentItems) =>
      currentItems.map((item) =>
        item.food_id === editingItem.food_id
          ? {
              food_id: data.food_id,
              food_name: data.food_name,
              category: data.category,
              quantity: data.quantity,
              batch_number: data.batch_number,
              purchase_date: data.purchase_date,
              expiry_date: data.expiry_date,
            }
          : item
      )
    );

    setEditingItem(null);

    setFormData({
      food_name: "",
      category: "Fruits",
      quantity: "",
      batch_number: "",
      purchase_date: "",
      expiry_date: "",
    });

    setShowSuccessPopup(true);

    setTimeout(() => {
      setShowSuccessPopup(false);
    }, 2500);

  } catch (err) {
    setError(err.message);
  }
};

// =========================
// DELETE FOOD ITEM
// =========================

const handleDelete = (item) => {
  setItemToDelete(item);
  setShowDeletePopup(true);
};

const confirmDelete = async () => {
  if (!itemToDelete) return;

  setError("");

  try {
    const token = localStorage.getItem("access_token");

    const response = await fetch(
      `http://127.0.0.1:8000/food/${itemToDelete.food_id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Failed to delete food item."
      );
    }

    setFoodItems((currentItems) =>
      currentItems.filter(
        (item) => item.food_id !== itemToDelete.food_id
      )
    );

    setShowDeletePopup(false);
    setItemToDelete(null);

  } catch (err) {
    setError(err.message);
  }
};

const cancelDelete = () => {
  setShowDeletePopup(false);
  setItemToDelete(null);
};

  // =========================
  // SEARCH + FILTER
  // =========================

  const filteredItems = foodItems
  .filter((item) => {
    const matchesSearch =
      item.food_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.batch_number
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const status = getItemStatus(item);

    const matchesFilter =
      filterStatus === "All" ||
      status === filterStatus;

    return matchesSearch && matchesFilter;
  })
  .sort((a, b) => {
    const priorityOrder = {
      "Sell First": 1,
      "High Priority": 2,
      "Medium Priority": 3,
      "Normal": 4,
    };

    return (
      priorityOrder[getItemPriority(a)] -
      priorityOrder[getItemPriority(b)]
    );
  });

  // =========================
  // STATUS CLASS
  // =========================

  const getStatusClass = (status) => {
    if (status === "Expired") {
      return "inventory-status-expired";
    }

    if (status === "Expiring Soon") {
      return "inventory-status-warning";
    }

    return "inventory-status-active";
  };

  return (
    <div className="inventory-management-page">

      {/* =========================
          PAGE HEADER
      ========================= */}

      <div className="inventory-management-header">

        <div>
          <span className="inventory-header-label">
            RETAIL MANAGEMENT
          </span>

          <h1>Inventory Management</h1>

          <p>
            Manage food products, stock levels, batches and expiry dates.
          </p>
        </div>

        <div className="inventory-date-box">
          <span>📅</span>

          <div>
            <strong>
              {today.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </strong>

            <small>Inventory Overview</small>
          </div>
        </div>

      </div>

      {/* =========================
          ERROR
      ========================= */}

      {error && (
        <div className="inventory-error">
          ⚠️ {error}
        </div>
      )}

      {/* =========================
          KPI CARDS
      ========================= */}

      <div className="inventory-kpi-grid">

        <div className="inventory-kpi-card">

          <div className="inventory-kpi-icon">
            📦
          </div>

          <div>
            <span>Total Products</span>
            <strong>{totalProducts}</strong>
            <small>Products in inventory</small>
          </div>

        </div>

        <div className="inventory-kpi-card">

          <div className="inventory-kpi-icon">
            📊
          </div>

          <div>
            <span>Total Quantity</span>
            <strong>{totalQuantity}</strong>
            <small>Units currently stocked</small>
          </div>

        </div>

        <div className="inventory-kpi-card">

          <div className="inventory-kpi-icon inventory-warning">
            ⏳
          </div>

          <div>
            <span>Expiring Soon</span>
            <strong>{expiringSoonProducts}</strong>
            <small>Within next 7 days</small>
          </div>

        </div>

        <div className="inventory-kpi-card">

          <div className="inventory-kpi-icon inventory-danger">
            ⚠️
          </div>

          <div>
            <span>Expired</span>
            <strong>{expiredProducts}</strong>
            <small>Require immediate action</small>
          </div>

        </div>

      </div>

      {/* =========================
          MAIN CONTENT
      ========================= */}

      <div className="inventory-management-grid">

        {/* =========================
            ADD PRODUCT
        ========================= */}

        <div className="inventory-add-card">

          <div className="inventory-section-header">

            <div>
              <span className="inventory-section-icon">
                ＋
              </span>

              <div>
                <h2>
  {editingItem ? "Edit Food Product" : "Add Food Product"}
</h2>
                <p>
  {editingItem
    ? "Update product information"
    : "Register a new product in inventory"}
</p>
              </div>
            </div>

          </div>

          <form
            className="inventory-professional-form"
            onSubmit={editingItem ? handleUpdate : handleSubmit}
          >

            <div className="inventory-form-group">
              <label>Food Name</label>

              <input
                type="text"
                name="food_name"
                value={formData.food_name}
                onChange={handleChange}
                placeholder="e.g. Apples"
                required
              />
            </div>

            <div className="inventory-form-group">
              <label>Category</label>

              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="Fruits">Fruits</option>
                <option value="Vegetables">Vegetables</option>
                <option value="Dairy">Dairy</option>
                <option value="Meat/Poultry">
                  Meat/Poultry
                </option>
                <option value="Seafood">Seafood</option>
                <option value="Bakery">Bakery</option>
                <option value="Packaged Foods">
                  Packaged Foods
                </option>
                <option value="Beverages">Beverages</option>
              </select>
            </div>

            <div className="inventory-form-row">

              <div className="inventory-form-group">
                <label>Quantity</label>

                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="Enter quantity"
                  min="1"
                  required
                />
              </div>

              <div className="inventory-form-group">
                <label>Batch Number</label>

                <input
                  type="text"
                  name="batch_number"
                  value={formData.batch_number}
                  onChange={handleChange}
                  placeholder="e.g. BTH-001"
                  required
                />
              </div>

            </div>

            <div className="inventory-form-row">

              <div className="inventory-form-group">
                <label>Purchase Date</label>

                <input
                  type="date"
                  name="purchase_date"
                  value={formData.purchase_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="inventory-form-group">
                <label>Expiry Date</label>

                <input
                  type="date"
                  name="expiry_date"
                  value={formData.expiry_date}
                  onChange={handleChange}
                  required
                />
              </div>

            </div>

            <button
  type="submit"
  className="inventory-add-button"
>
  {editingItem ? "✓ Update Product" : "＋ Add Product"}
</button>

          </form>

        </div>

        {/* =========================
            INVENTORY SUMMARY
        ========================= */}

        <div className="inventory-summary-card">

          <div className="inventory-section-header">

            <div>
              <span className="inventory-section-icon">
                ✓
              </span>

              <div>
                <h2>Inventory Status</h2>
                <p>Current stock health</p>
              </div>
            </div>

          </div>

          <div className="inventory-status-summary">

            <div className="inventory-summary-row">

              <div>
                <span className="summary-dot summary-green"></span>
                Active Products
              </div>

              <strong>
                {totalProducts -
                  expiredProducts -
                  expiringSoonProducts}
              </strong>

            </div>

            <div className="inventory-summary-row">

              <div>
                <span className="summary-dot summary-orange"></span>
                Expiring Soon
              </div>

              <strong>
                {expiringSoonProducts}
              </strong>

            </div>

            <div className="inventory-summary-row">

              <div>
                <span className="summary-dot summary-red"></span>
                Expired
              </div>

              <strong>
                {expiredProducts}
              </strong>

            </div>

          </div>

          <div className="inventory-summary-note">
            <span>💡</span>

            <p>
              Prioritize products approaching expiry
              to reduce food waste.
            </p>
          </div>

        </div>

      </div>

      {/* =========================
          INVENTORY TABLE
      ========================= */}

      <div className="inventory-table-card">

        <div className="inventory-table-header">

          <div>
            <span className="inventory-header-label">
              STOCK CONTROL
            </span>

            <h2>Current Inventory</h2>

            <p>
              Monitor products, batches and expiry status.
            </p>
          </div>

          <div className="inventory-table-count">
            {filteredItems.length} Products
          </div>

        </div>

        {/* SEARCH + FILTER */}

        <div className="inventory-controls">

          <div className="inventory-search">

            <span>⌕</span>

            <input
              type="text"
              placeholder="Search product or batch..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
            />

          </div>

          <select
            className="inventory-filter"
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value)
            }
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Expiring Soon">
              Expiring Soon
            </option>
            <option value="Expired">Expired</option>
          </select>

        </div>

        {/* TABLE */}

        {filteredItems.length === 0 ? (

          <div className="inventory-no-data">

            <div>📦</div>

            <h3>No Products Found</h3>

            <p>
              Add products to your inventory or adjust
              your search/filter.
            </p>

          </div>

        ) : (

          <div className="inventory-table-wrapper">

            <table className="inventory-professional-table">

              <thead>

                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Batch</th>
                  <th>Purchase Date</th>
                  <th>Expiry Date</th>
<th>Days Remaining</th>
<th>Priority</th>
<th>Status</th>
<th>Actions</th>
                </tr>

              </thead>

              <tbody>

                {filteredItems.map((item) => {

                  const status = getItemStatus(item);

                  return (
                    <tr key={item.food_id}>

                      <td>
                        <strong>
                          {item.food_name}
                        </strong>
                      </td>

                      <td>
                        {item.category || "—"}
                      </td>

                      <td>
                        <span className="inventory-quantity">
                          {item.quantity ?? "—"}
                        </span>
                      </td>

                      <td>
                        {item.batch_number || "—"}
                      </td>

                      <td>
                        {item.purchase_date || "—"}
                      </td>

                      <td>
  {item.expiry_date || "—"}
</td>

<td>
  {getDaysRemaining(item) < 0
    ? `${Math.abs(getDaysRemaining(item))} days overdue`
    : getDaysRemaining(item) === 0
    ? "Expires today"
    : `${getDaysRemaining(item)} days left`}
</td>

<td>
  <span
    className={`inventory-priority priority-${getItemPriority(item)
      .toLowerCase()
      .replaceAll(" ", "-")}`}
  >
    {getItemPriority(item)}
  </span>
</td>

<td>
  <span
    className={`inventory-status ${getStatusClass(
      status
    )}`}
  >
    {status}
  </span>
</td>
                      <td>
  <div className="inventory-action-buttons">
    <button
      type="button"
      className="inventory-edit-button"
      onClick={() => handleEdit(item)}
    >
      ✏️ Edit
    </button>

    <button
      type="button"
      className="inventory-delete-button"
      onClick={() => handleDelete(item)}
    >
      🗑️ Delete
    </button>
  </div>
</td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* =========================
          SUCCESS POPUP
      ========================= */}

      {showSuccessPopup && (

        <div className="inventory-success-overlay">

          <div className="inventory-success-popup">

            <div className="inventory-success-icon">
              ✓
            </div>

            <h2>Product Added</h2>

            <p>
              The food product has been successfully
              added to your inventory.
            </p>

            <button
              onClick={() =>
                setShowSuccessPopup(false)
              }
            >
              Continue
            </button>

          </div>

        </div>

      )}

      {/* =========================
    DELETE CONFIRMATION POPUP
========================= */}

{showDeletePopup && (
  <div className="inventory-success-overlay">

    <div className="inventory-success-popup">

      <div className="inventory-success-icon">
        🗑️
      </div>

      <h2>Delete Product?</h2>

      <p>
        Are you sure you want to delete{" "}
        <strong>
          {itemToDelete?.food_name}
        </strong>
        ?
      </p>

      <div className="inventory-action-buttons">
        <button
          type="button"
          className="inventory-edit-button"
          onClick={cancelDelete}
        >
          Cancel
        </button>

        <button
          type="button"
          className="inventory-delete-button"
          onClick={confirmDelete}
        >
          Delete
        </button>
      </div>

    </div>

  </div>
)}

    </div>
  );
}

export default Inventory;