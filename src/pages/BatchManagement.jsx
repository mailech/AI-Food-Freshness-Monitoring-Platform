import { useEffect, useState } from "react";

function BatchManagement() {
  const [foodItems, setFoodItems] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
            data.detail || "Failed to load batch data."
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
  // DAYS REMAINING
  // =========================

  const getDaysRemaining = (item) => {
    if (!item.expiry_date) {
      return null;
    }

    const expiry = new Date(item.expiry_date);
    expiry.setHours(0, 0, 0, 0);

    return Math.ceil(
      (expiry - today) /
        (1000 * 60 * 60 * 24)
    );
  };

  // =========================
  // BATCH STATUS
  // =========================

  const getBatchStatus = (item) => {
    const days = getDaysRemaining(item);

    if (days === null) {
      return "Active";
    }

    if (days < 0) {
      return "Expired";
    }

    if (days <= 7) {
      return "Expiring Soon";
    }

    return "Active";
  };

  // =========================
  // BATCH PRIORITY
  // =========================

  const getBatchPriority = (item) => {
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

  // =========================
  // SUMMARY
  // =========================

  const totalBatches = foodItems.length;

  const totalQuantity = foodItems.reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0
  );

  const urgentBatches = foodItems.filter(
    (item) =>
      getBatchPriority(item) === "Sell First" ||
      getBatchPriority(item) === "High Priority"
  ).length;

  const expiringBatches = foodItems.filter(
    (item) =>
      getBatchStatus(item) === "Expiring Soon"
  ).length;

  // =========================
  // SEARCH + FILTER + PRIORITY
  // =========================

  const filteredBatches = foodItems
    .filter((item) => {
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        item.food_name
          ?.toLowerCase()
          .includes(search) ||
        item.batch_number
          ?.toLowerCase()
          .includes(search) ||
        item.category
          ?.toLowerCase()
          .includes(search);

      const status = getBatchStatus(item);

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
        priorityOrder[getBatchPriority(a)] -
        priorityOrder[getBatchPriority(b)]
      );
    });

  // =========================
  // STATUS CLASS
  // =========================

  const getStatusClass = (status) => {
    if (status === "Expired") {
      return "batch-status-expired";
    }

    if (status === "Expiring Soon") {
      return "batch-status-warning";
    }

    return "batch-status-active";
  };

  // =========================
  // PRIORITY CLASS
  // =========================

  const getPriorityClass = (priority) => {
    if (priority === "Sell First") {
      return "batch-priority-sell";
    }

    if (priority === "High Priority") {
      return "batch-priority-high";
    }

    if (priority === "Medium Priority") {
      return "batch-priority-medium";
    }

    return "batch-priority-normal";
  };

  return (
    <div className="batch-management-page">

      {/* =========================
          HEADER
      ========================= */}

      <div className="batch-management-header">

        <div>
          <span className="batch-header-label">
            RETAIL MANAGEMENT
          </span>

          <h1>Batch Management</h1>

          <p>
            Monitor product batches, expiry dates and
            selling priorities.
          </p>
        </div>

        <div className="batch-date-box">
          <span>📅</span>

          <div>
            <strong>
              {today.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </strong>

            <small>Batch Overview</small>
          </div>
        </div>

      </div>

      {/* =========================
          ERROR
      ========================= */}

      {error && (
        <div className="batch-error">
          ⚠️ {error}
        </div>
      )}

      {/* =========================
          KPI CARDS
      ========================= */}

      <div className="batch-kpi-grid">

        <div className="batch-kpi-card">
          <div className="batch-kpi-icon">
            🔖
          </div>

          <div>
            <span>Total Batches</span>
            <strong>{totalBatches}</strong>
            <small>Registered batches</small>
          </div>
        </div>

        <div className="batch-kpi-card">
          <div className="batch-kpi-icon">
            📦
          </div>

          <div>
            <span>Total Stock</span>
            <strong>{totalQuantity}</strong>
            <small>Units across batches</small>
          </div>
        </div>

        <div className="batch-kpi-card">
          <div className="batch-kpi-icon batch-warning">
            ⏳
          </div>

          <div>
            <span>Expiring Batches</span>
            <strong>{expiringBatches}</strong>
            <small>Within 7 days</small>
          </div>
        </div>

        <div className="batch-kpi-card">
          <div className="batch-kpi-icon batch-danger">
            ⚠️
          </div>

          <div>
            <span>Urgent Batches</span>
            <strong>{urgentBatches}</strong>
            <small>Need attention</small>
          </div>
        </div>

      </div>

      {/* =========================
          BATCH TABLE
      ========================= */}

      <div className="batch-table-card">

        <div className="batch-table-header">

          <div>
            <span className="batch-header-label">
              BATCH CONTROL
            </span>

            <h2>Product Batches</h2>

            <p>
              Review batches and identify products
              that should be sold first.
            </p>
          </div>

          <div className="batch-table-count">
            {filteredBatches.length} Batches
          </div>

        </div>

        {/* =========================
            SEARCH + FILTER
        ========================= */}

        <div className="batch-controls">

          <div className="batch-search">

            <span>⌕</span>

            <input
              type="text"
              placeholder="Search product, batch or category..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
            />

          </div>

          <select
            className="batch-filter"
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
            <option value="Expired">
              Expired
            </option>
          </select>

        </div>

        {/* =========================
            TABLE
        ========================= */}

        {filteredBatches.length === 0 ? (

          <div className="batch-no-data">

            <div>🔖</div>

            <h3>No Batches Found</h3>

            <p>
              Add products to inventory to create
              batch records.
            </p>

          </div>

        ) : (

          <div className="batch-table-wrapper">

            <table className="batch-professional-table">

              <thead>

                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Batch Number</th>
                  <th>Quantity</th>
                  <th>Purchase Date</th>
                  <th>Expiry Date</th>
                  <th>Days Remaining</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>

              </thead>

              <tbody>

                {filteredBatches.map((item) => {

                  const days = getDaysRemaining(item);
                  const status = getBatchStatus(item);
                  const priority = getBatchPriority(item);

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
                        <span className="batch-number">
                          {item.batch_number || "—"}
                        </span>
                      </td>

                      <td>
                        <span className="batch-quantity">
                          {item.quantity ?? "—"}
                        </span>
                      </td>

                      <td>
                        {item.purchase_date || "—"}
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
                          className={`batch-priority ${getPriorityClass(
                            priority
                          )}`}
                        >
                          {priority}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`batch-status ${getStatusClass(
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

        )}

      </div>

    </div>
  );
}

export default BatchManagement;