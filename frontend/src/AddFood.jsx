import { useState } from "react";
import "./AddFood.css";

function AddFood({
  onSaveFood,
  onDashboard,
  onInventory,
  onAnalyze,
  onShelfLife,
  onAlerts,
  onRecommendations,
  onAnalytics,
  onProfile,
  onHome,
}) {
  const [foodName, setFoodName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [addedDate, setAddedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    onSaveFood({
      foodName,
      quantity,
      addedDate,
      expiryDate,
      batchNumber,
      notes,
      image,
    });
  };

  return (
    <div className="add-food-page">

      <aside className="add-food-sidebar">

        <div className="add-food-logo-section">
          <div className="add-food-logo">🍎</div>

          <div>
            <h2>FreshGuard AI</h2>
            <p>Food Monitoring</p>
          </div>
        </div>

        <nav className="add-food-nav">

          <button onClick={onDashboard}>
            <span>📊</span>
            Dashboard
          </button>

          <button onClick={onInventory}>
            <span>📦</span>
            Food Inventory
          </button>

          <button className="active">
            <span>➕</span>
            Add Food
          </button>

          <button onClick={onAnalyze}>
            <span>📷</span>
            Analyze Food
          </button>

          <button onClick={onShelfLife}>
            <span>⏰</span>
            Shelf Life
          </button>

          <button onClick={onAlerts}>
            <span>🚨</span>
            Alerts
          </button>

          <button onClick={onRecommendations}>
            <span>💡</span>
            Recommendations
          </button>

          <button onClick={onAnalytics}>
            <span>📈</span>
            Analytics
          </button>

          <button onClick={onProfile}>
            <span>👤</span>
            Profile
          </button>

        </nav>

        <div className="add-food-sidebar-bottom">
          <button onClick={onHome}>
            🏠 Back to Home
          </button>
        </div>

      </aside>

      <main className="add-food-main">

        <header className="add-food-header">

          <div>
            <p>FOOD MANAGEMENT</p>

            <h1>Add Food Item</h1>

            <span>
              Register a new food item for freshness monitoring.
            </span>
          </div>

          <button
            className="back-inventory-btn"
            onClick={onInventory}
          >
            ← Back to Inventory
          </button>

        </header>

        <form
          className="add-food-form"
          onSubmit={handleSubmit}
        >

          <section className="form-section">

            <div className="form-section-heading">

              <div className="form-section-icon">
                🍎
              </div>

              <div>
                <h2>Food Information</h2>

                <p>
                  Enter the details of the food item.
                </p>
              </div>

            </div>

            <div className="form-grid">

              <div className="form-group">

                <label>
                  Food Item <span>*</span>
                </label>

                <select
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  required
                >
                  <option value="">
                    Select food item
                  </option>

                  <option value="Apple">
                    Apple
                  </option>

                  <option value="Banana">
                    Banana
                  </option>

                  <option value="Orange">
                    Orange
                  </option>

                </select>

              </div>

              <div className="form-group">

                <label>
                  Quantity <span>*</span>
                </label>

                <input
                  type="number"
                  min="1"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Added / Purchase Date <span>*</span>
                </label>

                <input
                  type="date"
                  value={addedDate}
                  onChange={(e) => setAddedDate(e.target.value)}
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Expiry Date <span>*</span>
                </label>

                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  required
                />

              </div>

              <div className="form-group full-width">

                <label>
                  Batch Number
                </label>

                <input
                  type="text"
                  placeholder="Enter batch number (optional)"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                />

              </div>

            </div>

          </section>

          <section className="form-section">

            <div className="form-section-heading">

              <div className="form-section-icon">
                📷
              </div>

              <div>
                <h2>Food Image</h2>

                <p>
                  Upload an image for AI freshness analysis.
                </p>
              </div>

            </div>

            <label className="upload-box">

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files[0])}
              />

              <div className="upload-icon">
                {image ? "✓" : "📷"}
              </div>

              {image ? (
                <>
                  <h3>{image.name}</h3>

                  <p>
                    Image selected successfully
                  </p>
                </>
              ) : (
                <>
                  <h3>
                    Upload Food Image
                  </h3>

                  <p>
                    Click here to select an image
                  </p>

                  <small>
                    Supported formats: JPG, JPEG, PNG
                  </small>
                </>
              )}

            </label>

          </section>

          <section className="form-section">

            <div className="form-section-heading">

              <div className="form-section-icon">
                📝
              </div>

              <div>
                <h2>
                  Additional Information
                </h2>

                <p>
                  Add optional notes about this food item.
                </p>
              </div>

            </div>

            <div className="form-group">

              <label>
                Notes
              </label>

              <textarea
                placeholder="Enter any additional information..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="4"
              />

            </div>

          </section>

          <div className="ai-note">

            <div className="ai-note-icon">
              🤖
            </div>

            <div>

              <h3>
                AI Freshness Assessment
              </h3>

              <p>
                Freshness status, freshness score and remaining shelf
                life will be determined through AI analysis.
              </p>

            </div>

          </div>

          <div className="form-actions">

            <button
              type="button"
              className="cancel-btn"
              onClick={onInventory}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="save-food-btn"
            >
              ✓ Save Food Item
            </button>

          </div>

        </form>

      </main>

    </div>
  );
}

export default AddFood;