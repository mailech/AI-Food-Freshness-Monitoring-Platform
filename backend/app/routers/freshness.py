"""Authenticated freshness-analysis endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.freshness_analysis import FreshnessAnalysis
from app.models.user import User
from app.schemas.freshness import FreshnessAnalysisResponse
from app.services.freshness import analyze_freshness, delete_analysis, get_analysis, get_batch, list_analyses, store_uploaded_image, upload_directory
from ml.src.freshness_inference import InferenceError, InvalidImageError, ModelUnavailableError

router = APIRouter(prefix="/freshness", tags=["freshness"])
OperationalUser = Annotated[User, Depends(require_roles(UserRole.RETAIL_MANAGER, UserRole.WAREHOUSE_OPERATOR, UserRole.FOOD_QUALITY_INSPECTOR, UserRole.ADMINISTRATOR))]
AnalysisCreator = Annotated[User, Depends(require_roles(UserRole.CONSUMER, UserRole.RETAIL_MANAGER, UserRole.WAREHOUSE_OPERATOR, UserRole.FOOD_QUALITY_INSPECTOR, UserRole.ADMINISTRATOR))]
AuthenticatedUser = Annotated[User, Depends(get_current_user)]


def _batch_or_404(db: Session, food_batch_id: int) -> None:
    if get_batch(db, food_batch_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food batch not found.")


def _analysis_or_404(db: Session, analysis_id: int) -> FreshnessAnalysis:
    analysis = get_analysis(db, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Freshness analysis not found.")
    return analysis


def _discard_upload(image_reference: str) -> None:
    """Remove only the generated upload when analysis cannot be persisted."""
    candidate = upload_directory() / image_reference.rsplit('/', 1)[-1]
    if candidate.is_file():
        candidate.unlink()


@router.get("/health")
def freshness_health() -> dict[str, str]:
    return {"module": "freshness", "status": "ready"}


@router.post("/analyze", response_model=FreshnessAnalysisResponse, status_code=status.HTTP_201_CREATED)
async def create_analysis(food_batch_id: Annotated[int, Form()], image: Annotated[UploadFile, File(...)], db: Annotated[Session, Depends(get_db)], _: AnalysisCreator) -> FreshnessAnalysis:
    """Store a validated image and run the trained freshness classifier."""
    _batch_or_404(db, food_batch_id)
    image_reference = await store_uploaded_image(image)
    try:
        return analyze_freshness(db, food_batch_id, image_reference)
    except InvalidImageError as exc:
        _discard_upload(image_reference)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except ModelUnavailableError as exc:
        _discard_upload(image_reference)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Freshness model is unavailable.") from exc
    except InferenceError as exc:
        _discard_upload(image_reference)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Freshness model inference failed.") from exc
    except Exception:
        # Do not leave a file behind if persistence fails.
        _discard_upload(image_reference)
        raise


@router.get("/analyses/{analysis_id}", response_model=FreshnessAnalysisResponse)
def read_analysis(analysis_id: int, db: Annotated[Session, Depends(get_db)], _: AuthenticatedUser) -> FreshnessAnalysis:
    return _analysis_or_404(db, analysis_id)


@router.get("/batches/{food_batch_id}/analyses", response_model=list[FreshnessAnalysisResponse])
def read_batch_analyses(food_batch_id: int, db: Annotated[Session, Depends(get_db)], _: AuthenticatedUser) -> list[FreshnessAnalysis]:
    _batch_or_404(db, food_batch_id)
    return list_analyses(db, food_batch_id)


@router.delete("/analyses/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_analysis(analysis_id: int, db: Annotated[Session, Depends(get_db)], _: OperationalUser) -> Response:
    delete_analysis(db, _analysis_or_404(db, analysis_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
