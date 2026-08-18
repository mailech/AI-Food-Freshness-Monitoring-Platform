import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

const CATEGORIES = [
  "fruits", "vegetables", "dairy", "meat_poultry",
  "seafood", "bakery", "packaged", "beverages",
];

export default function AddFoodItem() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("fruits");
  const [batchId, setBatchId] = useState("");
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleImageChange(e) {
    const file = e.target.files[0];
    setImage(file || null);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("category", category);
    if (batchId) formData.append("batch_id", batchId);
    if (temperature) formData.append("storage_temperature_c", temperature);
    if (humidity) formData.append("storage_humidity_pct", humidity);
    if (image) formData.append("image", image);

    try {
      const item = await api.createFoodItem(formData);
      navigate(`/items/${item.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page page-narrow">
      <h1>Add Food Item</h1>
      <p className="page-subtitle">
        Upload a photo and storage conditions - we'll generate a freshness score for it.
      </p>

      <form className="card-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <label>
          Item name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label>
          Batch ID (optional)
          <input value={batchId} onChange={(e) => setBatchId(e.target.value)} />
        </label>

        <div className="form-row">
          <label>
            Storage temperature (°C)
            <input
              type="number"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
            />
          </label>

          <label>
            Storage humidity (%)
            <input
              type="number"
              step="0.1"
              value={humidity}
              onChange={(e) => setHumidity(e.target.value)}
            />
          </label>
        </div>

        <label>
          Food image (optional)
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </label>

        {preview && (
          <div className="image-preview">
            <img src={preview} alt="Preview" />
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Analyzing..." : "Add & Analyze Freshness"}
        </button>
      </form>
    </div>
  );
}
