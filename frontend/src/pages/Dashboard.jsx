import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import FoodItemCard from "../components/FoodItemCard";

const CATEGORIES = [
  "fruits", "vegetables", "dairy", "meat_poultry",
  "seafood", "bakery", "packaged", "beverages",
];

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, [categoryFilter]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [itemsData, statsData] = await Promise.all([
        api.listFoodItems(categoryFilter),
        api.dashboardStats(),
      ]);
      setItems(itemsData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Your Food Inventory</h1>
        <Link to="/add-item" className="btn-primary">
          + Add Food Item
        </Link>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{stats.total_items}</span>
            <span className="stat-label">Total Items</span>
          </div>
          <div className="stat-card stat-fresh">
            <span className="stat-value">{stats.fresh_count}</span>
            <span className="stat-label">Fresh / Good</span>
          </div>
          <div className="stat-card stat-warning">
            <span className="stat-value">{stats.near_spoilage_count}</span>
            <span className="stat-label">Near Spoilage</span>
          </div>
          <div className="stat-card stat-danger">
            <span className="stat-value">{stats.spoiled_count}</span>
            <span className="stat-label">Spoiled</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.average_freshness_score}</span>
            <span className="stat-label">Avg Freshness Score</span>
          </div>
        </div>
      )}

      <div className="filter-bar">
        <label>
          Filter by category:
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="form-error">{error}</div>}
      {loading && <p>Loading items...</p>}

      {!loading && items.length === 0 && (
        <div className="empty-state">
          <p>No food items yet. Add your first one to see a freshness score.</p>
          <Link to="/add-item" className="btn-primary">
            + Add Food Item
          </Link>
        </div>
      )}

      <div className="food-grid">
        {items.map((item) => (
          <FoodItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
