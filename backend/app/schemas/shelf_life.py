from datetime import date

from pydantic import BaseModel


class ShelfLifeOut(BaseModel):
    item_id: int
    base_shelf_life_days: int
    predicted_total_days: float
    remaining_days: int
    forecast_expiry_date: date
    expiry_low: date
    expiry_high: date
    confidence_interval_days: int
    early_spoilage_likelihood: str
    storage_impact_factor: float
    notes: list[str]
