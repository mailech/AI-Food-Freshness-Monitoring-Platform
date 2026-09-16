import { useEffect, useState } from "react";

function ConsumerInventory() {
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    food_name: "",
    category: "Fruits",
    quantity: "",
    batch_number: "",
    purchase_date: "",
    expiry_date: "",
  });

  // =========================
  // DATE
  // =========================

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // =========================
  // GET EXPIRY STATUS
  // =========================

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) {
      return "Good";
    }

    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    const difference =
      (expiry - today) / (1000 * 60 * 60 * 24);

    if (difference < 0) {
      return "Expired";
    }

    if (difference <= 7) {
      return "Expiring Soon";
    }

    return "Good";
  };

  // =========================
  // GET DAYS REMAINING
  // =========================

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) {
      return null;
    }

    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    const difference =
      (expiry - today) / (1000 * 60 * 60 * 24);

    return Math.ceil(difference);
  };

  // =========================
  // FETCH INVENTORY
  // =========================

  const fetchInventory = async () => {
    try {
      setError("");

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

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

      setFormData({
        food_name: "",
        category: "Fruits",
        quantity: "",
        batch_number: "",
        purchase_date: "",
        expiry_date: "",
      });

      setShowForm(false);

    } catch (err) {
      setError(err.message);
    }
  };

  // =========================
  // SUMMARY
  // =========================

  const totalItems = foodItems.length;

  const totalQuantity = foodItems.reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0
  );

  const expiringSoon = foodItems.filter(
    (item) =>
      getExpiryStatus(item.expiry_date) === "Expiring Soon"
  ).length;

  const expired = foodItems.filter(
    (item) =>
      getExpiryStatus(item.expiry_date) === "Expired"
  ).length;

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

  // =========================
  // UI
  // =========================

  return (
    <div className="report-detail-page">

      {/* =========================
          HEADER
      ========================= */}

      <div className="report-detail-header">

        <h1>📦 My Food Inventory</h1>

        <p>
          Manage and monitor your stored food items
        </p>

        <button
          className="download-report-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm
            ? "✕ Close"
            : "➕ Add Food Item"}
        </button>

      </div>

      {/* =========================
          ERROR
      ========================= */}

      {error && (
        <div className="no-report-data">

          <div className="no-report-icon">
            ⚠️
          </div>

          <h2>
            Unable to Process Request
          </h2>

          <p>
            {error}
          </p>

        </div>
      )}

      {/* =========================
          ADD FOOD FORM
      ========================= */}

      {showForm && (

        <div className="inventory-report-table-card">

          <h2>➕ Add Food Item</h2>

          <p>
            Add a food item to your personal inventory.
          </p>

          <form
            onSubmit={handleSubmit}
            className="inventory-professional-form"
          >

            <div className="inventory-form-group">

              <label>
                Food Name
              </label>

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

              <label>
                Category
              </label>

              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
              >

                <option value="Fruits">
                  Fruits
                </option>

                <option value="Vegetables">
                  Vegetables
                </option>

                <option value="Dairy">
                  Dairy
                </option>

                <option value="Meat/Poultry">
                  Meat/Poultry
                </option>

                <option value="Seafood">
                  Seafood
                </option>

                <option value="Bakery">
                  Bakery
                </option>

                <option value="Packaged Foods">
                  Packaged Foods
                </option>

                <option value="Beverages">
                  Beverages
                </option>

              </select>

            </div>

            <div className="inventory-form-row">

              <div className="inventory-form-group">

                <label>
                  Quantity
                </label>

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

                <label>
                  Batch Number
                </label>

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

                <label>
                  Purchase Date
                </label>

                <input
                  type="date"
                  name="purchase_date"
                  value={formData.purchase_date}
                  onChange={handleChange}
                  required
                />

              </div>

              <div className="inventory-form-group">

                <label>
                  Expiry Date
                </label>

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
              ＋ Add Food Item
            </button>

          </form>

        </div>
      )}

      {/* =========================
          LOADING
      ========================= */}

      {loading ? (

        <div className="no-report-data">

          <div className="no-report-icon">
            📦
          </div>

          <h2>
            Loading Inventory...
          </h2>

          <p>
            Please wait while your inventory is loaded.
          </p>

        </div>

      ) : foodItems.length === 0 ? (

        <div className="no-report-data">

          <div className="no-report-icon">
            📦
          </div>

          <h2>
            No Food Items Found
          </h2>

          <p>
            Add food items to your inventory.
          </p>

        </div>

      ) : (

        <>
          {/* =========================
              SUMMARY CARDS
          ========================= */}

          <div className="inventory-report-summary">

            <div className="inventory-report-stat">

              <span>📦</span>

              <strong>
                {totalItems}
              </strong>

              <p>
                Total Items
              </p>

            </div>

            <div className="inventory-report-stat">

              <span>🔢</span>

              <strong>
                {totalQuantity}
              </strong>

              <p>
                Total Quantity
              </p>

            </div>

            <div className="inventory-report-stat">

              <span>⏳</span>

              <strong>
                {expiringSoon}
              </strong>

              <p>
                Expiring Soon
              </p>

            </div>

            <div className="inventory-report-stat">

              <span>⚠️</span>

              <strong>
                {expired}
              </strong>

              <p>
                Expired
              </p>

            </div>

          </div>

          {/* =========================
              INVENTORY TABLE
          ========================= */}

          <div className="inventory-report-table-card">

            <h2>
              My Food Items
            </h2>

            <div className="inventory-report-table-wrapper">

              <table className="inventory-report-table">

                <thead>

                  <tr>
                    <th>Food</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Batch</th>
                    <th>Expiry Date</th>
                    <th>Days Remaining</th>
                    <th>Status</th>
                  </tr>

                </thead>

                <tbody>

                  {foodItems.map((item) => {

                    const status =
                      getExpiryStatus(
                        item.expiry_date
                      );

                    const days =
                      getDaysRemaining(
                        item.expiry_date
                      );

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
                          {item.quantity ?? "—"}
                        </td>

                        <td>
                          {item.batch_number || "—"}
                        </td>

                        <td>
                          {item.expiry_date || "—"}
                        </td>

                        <td>

                          {days === null
                            ? "—"
                            : days < 0
                            ? `${Math.abs(days)} days overdue`
                            : days === 0
                            ? "Expires today"
                            : `${days} days left`}

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

                      </tr>

                    );
                  })}

                </tbody>

              </table>

            </div>

          </div>

        </>
      )}

    </div>
  );
}

export default ConsumerInventory;