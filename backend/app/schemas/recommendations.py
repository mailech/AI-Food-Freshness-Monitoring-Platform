from pydantic import BaseModel


class RecommendationOut(BaseModel):
    type: str
    priority: str
    message: str
    item_id: int | None = None
    remaining_days: int | None = None
    rank: int | None = None
