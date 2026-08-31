from pydantic import BaseModel


class ScoreComponentsOut(BaseModel):
    visual: float
    storage: float
    shelf_life: float
    age: float


class FreshnessScoreOut(BaseModel):
    item_id: int
    overall_score: float
    health_category: str
    confidence: float
    weights: dict[str, float]
    components: ScoreComponentsOut
    notes: list[str]
