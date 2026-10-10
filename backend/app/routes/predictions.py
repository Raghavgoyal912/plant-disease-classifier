"""History endpoints: GET /predictions, GET /predictions/{id},
DELETE /predictions/{id}, POST /predictions/{id}/feedback (section 6).

All require a valid token and only ever see the signed-in user's rows. An id
that belongs to someone else (or doesn't exist) returns 404, never 403."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app import db
from app.auth import get_current_user
from app.schemas import FeedbackRequest, PaginatedPredictions, PredictionRecord

router = APIRouter()


@router.get("/predictions", response_model=PaginatedPredictions)
def list_predictions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    label: Optional[str] = None,
    user_id: str = Depends(get_current_user),
) -> PaginatedPredictions:
    items, total = db.list_predictions(user_id, page, page_size, label)
    return PaginatedPredictions(items=items, page=page, page_size=page_size, total=total)


@router.get("/predictions/{prediction_id}", response_model=PredictionRecord)
def get_prediction(
    prediction_id: str,
    user_id: str = Depends(get_current_user),
) -> PredictionRecord:
    row = db.get_prediction(user_id, prediction_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    return row


@router.delete("/predictions/{prediction_id}", status_code=204)
def delete_prediction(
    prediction_id: str,
    user_id: str = Depends(get_current_user),
) -> None:
    deleted = db.delete_prediction(user_id, prediction_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Prediction not found.")


@router.post("/predictions/{prediction_id}/feedback", response_model=PredictionRecord)
def submit_feedback(
    prediction_id: str,
    feedback: FeedbackRequest,
    user_id: str = Depends(get_current_user),
) -> PredictionRecord:
    row = db.update_feedback(user_id, prediction_id, feedback.correct, feedback.corrected_label)
    if row is None:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    return row