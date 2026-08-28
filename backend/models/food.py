from pydantic import BaseModel, Field


class FoodAnalysis(BaseModel):
    product_type: str
    temperature: float = Field(ge=-30, le=60)
    humidity: float = Field(ge=0, le=100)
    packaging: str
    storage_duration: int = Field(ge=0, le=3650)