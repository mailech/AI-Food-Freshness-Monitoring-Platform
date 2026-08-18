import { Link } from "react-router-dom";
import FreshnessBadge from "./FreshnessBadge";

export default function FoodItemCard({ item }) {
  return (
    <Link to={`/items/${item.id}`} className="food-card">
      <div className="food-card-image">
        {item.image_filename ? (
          <img src={`/uploads/${item.image_filename}`} alt={item.name} />
        ) : (
          <div className="food-card-image-placeholder">No image</div>
        )}
      </div>
      <div className="food-card-body">
        <div className="food-card-header">
          <h3>{item.name}</h3>
          <FreshnessBadge label={item.freshness_label} />
        </div>
        <p className="food-card-category">{item.category.replace("_", " ")}</p>
        <div className="food-card-meta">
          <span>Score: {item.freshness_score ?? "-"}</span>
          <span>Shelf life: {item.predicted_shelf_life_days ?? "-"} days</span>
        </div>
      </div>
    </Link>
  );
}
