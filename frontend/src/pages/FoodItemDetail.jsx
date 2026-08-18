import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import FreshnessBadge from "../components/FreshnessBadge";

export default function FoodItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getFoodItem(id).then(setItem).catch((err) => setError(err.message));
  }, [id]);

  async function handleRescan() {
    setBusy(true);
    try {
      const updated = await api.rescanFoodItem(id);
      setItem(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${item.name}"? This can't be undone.`)) return;
    setBusy(true);
    try {
      await api.deleteFoodItem(id);
      navigate("/");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (error) return <div className="page form-error">{error}</div>;
  if (!item) return <div className="page">Loading...</div>;

  return (
    <div className="page page-narrow">
      <Link to="/" className="back-link">
        ← Back to inventory
      </Link>

      <div className="detail-card">
        <div className="detail-image">
          {item.image_filename ? (
            <img src={`/uploads/${item.image_filename}`} alt={item.name} />
          ) : (
            <div className="food-card-image-placeholder">No image</div>
          )}
        </div>

        <div className="detail-body">
          <div className="detail-header">
            <h1>{item.name}</h1>
            <FreshnessBadge label={item.freshness_label} />
          </div>
          <p className="food-card-category">{item.category.replace("_", " ")}</p>
          {item.batch_id && <p className="detail-batch">Batch: {item.batch_id}</p>}

          <div className="detail-metrics">
            <div>
              <span className="detail-metric-value">{item.freshness_score ?? "-"}</span>
              <span className="detail-metric-label">Freshness Score</span>
            </div>
            <div>
              <span className="detail-metric-value">
                {item.predicted_shelf_life_days ?? "-"}
              </span>
              <span className="detail-metric-label">Days Remaining (est.)</span>
            </div>
            <div>
              <span className="detail-metric-value">
                {item.storage_temperature_c ?? "-"}°C
              </span>
              <span className="detail-metric-label">Storage Temp</span>
            </div>
            <div>
              <span className="detail-metric-value">
                {item.storage_humidity_pct ?? "-"}%
              </span>
              <span className="detail-metric-label">Storage Humidity</span>
            </div>
          </div>

          <p className="detail-timestamp">
            Last analyzed: {new Date(item.updated_at).toLocaleString()}
          </p>

          <div className="detail-actions">
            <button className="btn-secondary" onClick={handleRescan} disabled={busy}>
              {busy ? "Working..." : "Re-run Freshness Scan"}
            </button>
            <button className="btn-danger" onClick={handleDelete} disabled={busy}>
              Delete Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
