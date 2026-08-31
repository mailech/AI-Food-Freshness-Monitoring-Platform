from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.ml.recommendations import item_recommendations, rotation_recommendations
from app.models import User
from app.models.inventory import FoodItem
from app.routers.auth import get_current_user
from app.routers.inventory import _get_owned_item
from app.schemas.recommendations import RecommendationOut
from app.services.scoring import gather_item_state

router = APIRouter(prefix="/inventory", tags=["recommendations"])


@router.get("/items/{item_id}/recommendations", response_model=list[RecommendationOut])
def item_recs(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = _get_owned_item(item_id, user, db)
    state = gather_item_state(db, item)
    return [
        RecommendationOut(item_id=item.id, **rec) for rec in item_recommendations(state)
    ]


@router.get("/recommendations", response_model=list[RecommendationOut])
def inventory_recs(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.query(FoodItem).filter(FoodItem.owner_id == user.id).all()
    if not items:
        return []
    states = [gather_item_state(db, item) for item in items]
    recs: list[RecommendationOut] = []
    for state in states:
        recs.extend(
            RecommendationOut(item_id=state["item"].id, **rec)
            for rec in item_recommendations(state)
        )
    recs.extend(RecommendationOut(**rec) for rec in rotation_recommendations(states))
    order = {"high": 0, "medium": 1, "low": 2}
    recs.sort(key=lambda r: (order[r.priority], r.item_id or 0))
    return recs
