"""Authenticated composite freshness-scoring endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.freshness_score import FreshnessScore
from app.models.user import User
from app.schemas.freshness_scoring import FreshnessScoreResponse
from app.services.freshness_scoring import (
    create_freshness_score,
    delete_freshness_score,
    get_batch,
    get_freshness_score,
    list_batch_scores,
)

router = APIRouter(prefix="/freshness-scoring", tags=["freshness-scoring"])
AuthenticatedUser = Annotated[User, Depends(get_current_user)]
OperationalUser = Annotated[
    User,
    Depends(
        require_roles(
            UserRole.RETAIL_MANAGER,
            UserRole.WAREHOUSE_OPERATOR,
            UserRole.FOOD_QUALITY_INSPECTOR,
            UserRole.ADMINISTRATOR,
        )
    ),
]
DatabaseSession = Annotated[Session, Depends(get_db)]


def _batch_or_404(db: Session, food_batch_id: int) -> None:
    if get_batch(db, food_batch_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food batch not found.")


def _score_or_404(db: Session, score_id: int) -> FreshnessScore:
    score = get_freshness_score(db, score_id)
    if score is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Freshness score not found.")
    return score


@router.post("/batches/{food_batch_id}", response_model=FreshnessScoreResponse,
             status_code=status.HTTP_201_CREATED)
def create_score(food_batch_id: int, db: DatabaseSession, _: OperationalUser) -> FreshnessScore:
    """Store a pending evaluation without calculating unavailable model outputs."""
    _batch_or_404(db, food_batch_id)
    return create_freshness_score(db, food_batch_id)


@router.get("/batches/{food_batch_id}", response_model=list[FreshnessScoreResponse])
def read_batch_scores(food_batch_id: int, db: DatabaseSession,
                      _: AuthenticatedUser) -> list[FreshnessScore]:
    """Return stored scoring evaluations for a batch, newest first."""
    _batch_or_404(db, food_batch_id)
    return list_batch_scores(db, food_batch_id)


@router.get("/{score_id}", response_model=FreshnessScoreResponse)
def read_score(score_id: int, db: DatabaseSession, _: AuthenticatedUser) -> FreshnessScore:
    """Return a stored scoring evaluation."""
    return _score_or_404(db, score_id)


@router.delete("/{score_id}", status_code=status.HTTP_200_OK)
def remove_score(score_id: int, db: DatabaseSession, _: OperationalUser) -> Response:
    """Delete a scoring evaluation; this does not affect its food batch."""
    delete_freshness_score(db, _score_or_404(db, score_id))
    return Response(status_code=status.HTTP_200_OK)
