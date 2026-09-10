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

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [foodItems, setFoodItems] = useState([]);

  // Fetch inventory items
  useEffect(() => {
    const fetchFoodItems = async () => {
      try {
        const token = localStorage.getItem("access_token");

        const response = await fetch("http://127.0.0.1:8000/food/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Failed to load inventory.");
        }

        setFoodItems(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchFoodItems();
  }, []);

  // Handle form changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Add food item
  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch("http://127.0.0.1:8000/food/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to add food item.");
      }

      setShowSuccessPopup(true);

      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);

      // Add the newly created item to the visible inventory list
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

      // Clear form
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

  return (
    <div className="inventory-page">
      <div className="inventory-card">

        {/* Page Header */}
        <div className="inventory-header">
          <h1>Food Inventory</h1>
          <p>Add and manage your food items</p>
        </div>

        {/* Success Popup */}
        {showSuccessPopup && (
          <div className="success-popup-overlay">
            <div className="success-popup">
              <div className="success-popup-icon">✓</div>

              <h2>Food Added Successfully!</h2>

              <p>
                Your food item has been added to the inventory.
              </p>

              <button
                type="button"
                onClick={() => setShowSuccessPopup(false)}
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <div className="error-message">{error}</div>}

        {/* Main Two Column Layout */}
        <div className="inventory-content">

          {/* LEFT SIDE - ADD FOOD */}
          <div className="inventory-form-section">
            <h2>Add Food Item</h2>

            <form onSubmit={handleSubmit}>

              <label>Food Name</label>
              <input
                type="text"
                name="food_name"
                value={formData.food_name}
                onChange={handleChange}
                placeholder="Enter food name"
                required
              />

              <label>Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="Fruits">Fruits</option>
                <option value="Vegetables">Vegetables</option>
                <option value="Dairy">Dairy</option>
                <option value="Meat/Poultry">Meat/Poultry</option>
                <option value="Seafood">Seafood</option>
                <option value="Bakery">Bakery</option>
                <option value="Packaged Foods">Packaged Foods</option>
                <option value="Beverages">Beverages</option>
              </select>

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

              <label>Batch Number</label>
              <input
                type="text"
                name="batch_number"
                value={formData.batch_number}
                onChange={handleChange}
                placeholder="Enter batch number"
                required
              />

              <label>Purchase Date</label>
              <input
                type="date"
                name="purchase_date"
                value={formData.purchase_date}
                onChange={handleChange}
                required
              />

              <label>Expiry Date</label>
              <input
                type="date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleChange}
                required
              />

              <button type="submit">
                Add Food Item
              </button>

            </form>
          </div>

          {/* RIGHT SIDE - INVENTORY */}
          <div className="inventory-list">
            <h2>Your Inventory</h2>

            {foodItems.length === 0 ? (
              <p className="no-items">
                No food items found.
              </p>
            ) : (
              <div className="inventory-items-grid">

                {foodItems.map((item) => (
                  <div
                    className="inventory-item"
                    key={item.food_id}
                  >
                    <h3>{item.food_name}</h3>

                    <p>
                      <strong>Category:</strong> {item.category}
                    </p>

                    <p>
                      <strong>Quantity:</strong> {item.quantity}
                    </p>

                    <p>
                      <strong>Batch:</strong> {item.batch_number}
                    </p>

                    <p>
                      <strong>Purchase:</strong> {item.purchase_date}
                    </p>

                    <p>
                      <strong>Expiry:</strong> {item.expiry_date}
                    </p>
                  </div>
                ))}

              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default Inventory;