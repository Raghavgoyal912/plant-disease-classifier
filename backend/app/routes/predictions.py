"""History endpoints: GET /predictions, GET /predictions/{id},
DELETE /predictions/{id}, POST /predictions/{id}/feedback (section 6)."""
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app import db
from app.schemas import FeedbackRequest, PaginatedPredictions, PredictionRecord

router = APIRouter()


@router.get("/predictions", response_model=PaginatedPredictions)
def list_predictions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    label: Optional[str] = None,
) -> PaginatedPredictions:
    items, total = db.list_predictions(page, page_size, label)
    return PaginatedPredictions(items=items, page=page, page_size=page_size, total=total)


@router.get("/predictions/{prediction_id}", response_model=PredictionRecord)
def get_prediction(prediction_id: str) -> PredictionRecord:
    row = db.get_prediction(prediction_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    return row


@router.delete("/predictions/{prediction_id}", status_code=204)
def delete_prediction(prediction_id: str) -> None:
    deleted = db.delete_prediction(prediction_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Prediction not found.")


@router.post("/predictions/{prediction_id}/feedback", response_model=PredictionRecord)
def submit_feedback(prediction_id: str, feedback: FeedbackRequest) -> PredictionRecord:
    row = db.update_feedback(prediction_id, feedback.correct, feedback.corrected_label)
    if row is None:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    return row