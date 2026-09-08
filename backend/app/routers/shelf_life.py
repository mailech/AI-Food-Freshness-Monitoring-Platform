"""Authenticated shelf-life prediction endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.shelf_life_prediction import ShelfLifePrediction
from app.models.user import User
from app.schemas.shelf_life import ShelfLifePredictionRequest, ShelfLifePredictionResponse
from app.services.shelf_life import delete_prediction, get_batch, get_freshness_analysis, get_prediction, list_predictions, predict_shelf_life

router = APIRouter(prefix="/shelf-life", tags=["shelf-life"])
OperationalUser = Annotated[User, Depends(require_roles(UserRole.RETAIL_MANAGER, UserRole.WAREHOUSE_OPERATOR, UserRole.FOOD_QUALITY_INSPECTOR, UserRole.ADMINISTRATOR))]
AuthenticatedUser = Annotated[User, Depends(get_current_user)]


def _batch_or_404(db: Session, batch_id: int) -> None:
    if get_batch(db, batch_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food batch not found.")


def _prediction_or_404(db: Session, prediction_id: int) -> ShelfLifePrediction:
    prediction = get_prediction(db, prediction_id)
    if prediction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shelf-life prediction not found.")
    return prediction


@router.get("/health")
def shelf_life_health() -> dict[str, str]:
    return {"module": "shelf-life", "status": "ready"}


@router.post("/predict", response_model=ShelfLifePredictionResponse, status_code=status.HTTP_201_CREATED)
def create_prediction(payload: ShelfLifePredictionRequest, db: Annotated[Session, Depends(get_db)], _: OperationalUser) -> ShelfLifePrediction:
    _batch_or_404(db, payload.food_batch_id)
    if payload.freshness_analysis_id is not None:
        analysis = get_freshness_analysis(db, payload.freshness_analysis_id)
        if analysis is None or analysis.food_batch_id != payload.food_batch_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Freshness analysis not found for this food batch.")
    return predict_shelf_life(db, payload)


@router.get("/predictions/{prediction_id}", response_model=ShelfLifePredictionResponse)
def read_prediction(prediction_id: int, db: Annotated[Session, Depends(get_db)], _: AuthenticatedUser) -> ShelfLifePrediction:
    return _prediction_or_404(db, prediction_id)


@router.get("/batches/{food_batch_id}/predictions", response_model=list[ShelfLifePredictionResponse])
def read_batch_predictions(food_batch_id: int, db: Annotated[Session, Depends(get_db)], _: AuthenticatedUser) -> list[ShelfLifePrediction]:
    _batch_or_404(db, food_batch_id)
    return list_predictions(db, food_batch_id)


@router.delete("/predictions/{prediction_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_prediction(prediction_id: int, db: Annotated[Session, Depends(get_db)], _: OperationalUser) -> Response:
    delete_prediction(db, _prediction_or_404(db, prediction_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
