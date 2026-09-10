import { useEffect, useState } from "react";

function InventoryQualityReport() {
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInventory = async () => {
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
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getExpiryStatus = (expiryDate) => {
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

  const totalQuantity = foodItems.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const expiredItems = foodItems.filter(
    (item) => getExpiryStatus(item.expiry_date) === "Expired"
  );

  const expiringSoonItems = foodItems.filter(
    (item) =>
      getExpiryStatus(item.expiry_date) === "Expiring Soon"
  );

  return (
    <div className="report-detail-page">

      <div className="report-detail-header">
        <h1>📦 Inventory Quality Report</h1>

        <p>
          Overview of your food inventory and expiry status
        </p>
      </div>

      {loading ? (
        <div className="no-report-data">
          <div className="no-report-icon">📦</div>
          <h2>Loading Inventory...</h2>
          <p>Please wait while your inventory data is loaded.</p>
        </div>
      ) : error ? (
        <div className="no-report-data">
          <div className="no-report-icon">⚠️</div>
          <h2>Unable to Load Inventory</h2>
          <p>{error}</p>
        </div>
      ) : foodItems.length === 0 ? (
        <div className="no-report-data">
          <div className="no-report-icon">📦</div>

          <h2>No Inventory Data Available</h2>

          <p>
            Add food items from the Inventory page to generate
            an inventory quality report.
          </p>
        </div>
      ) : (
        <>
          {/* SUMMARY */}

          <div className="inventory-report-summary">

            <div className="inventory-report-stat">
              <span>📦</span>
              <strong>{foodItems.length}</strong>
              <p>Total Items</p>
            </div>

            <div className="inventory-report-stat">
              <span>🔢</span>
              <strong>{totalQuantity}</strong>
              <p>Total Quantity</p>
            </div>

            <div className="inventory-report-stat">
              <span>📅</span>
              <strong>{expiringSoonItems.length}</strong>
              <p>Expiring Soon</p>
            </div>

            <div className="inventory-report-stat">
              <span>⚠️</span>
              <strong>{expiredItems.length}</strong>
              <p>Expired</p>
            </div>

          </div>


          {/* INVENTORY TABLE */}

          <div className="inventory-report-table-card">

            <h2>Inventory Details</h2>

            <div className="inventory-report-table-wrapper">

              <table className="inventory-report-table">

                <thead>
                  <tr>
                    <th>Food</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Batch</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>

                  {foodItems.map((item) => {

                    const status = getExpiryStatus(
                      item.expiry_date
                    );

                    return (
                      <tr key={item.food_id}>

                        <td>
                          <strong>{item.food_name}</strong>
                        </td>

                        <td>{item.category}</td>

                        <td>{item.quantity}</td>

                        <td>{item.batch_number}</td>

                        <td>{item.expiry_date}</td>

                        <td>
                          <span
                            className={`inventory-status inventory-${status
                              .toLowerCase()
                              .replace(" ", "-")}`}
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

export default InventoryQualityReport;