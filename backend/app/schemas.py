"""
Pydantic request/response models matching the API contract in
PROJECT_CONTEXT.md section 6. user_id is never exposed in responses
(Phase 7: every route is already scoped to the signed-in user).
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class Top3Item(BaseModel):
    label: str
    confidence: float


class Advice(BaseModel):
    """Plain-language advice for one disease class. Mirrors the four text
    columns of the `disease_info` table (section 7). Also used as the
    Gemini structured-output schema in app/gemini.py."""
    summary: str
    symptoms: str
    treatment: str
    prevention: str


class DiseaseInfoResponse(BaseModel):
    """Response model for GET /disease-info/{label}."""
    summary: str
    symptoms: str
    treatment: str
    prevention: str


class PredictResponse(BaseModel):
    id: str
    label: str
    confidence: float
    top3: List[Top3Item]
    is_uncertain: bool
    image_url: str  # signed URL, expires after 1 hour (Phase 7)
    model_version: str
    # Phase 5: null when the prediction is uncertain, or when Gemini/cache
    # lookup is unavailable. Never present on PredictionRecord.
    advice: Optional[Advice] = None


class PredictionRecord(BaseModel):
    id: str
    image_path: str
    # Phase 7: signed URL built by the backend (bucket is private). null only
    # if signing failed for that image.
    image_url: Optional[str] = None
    predicted_label: str
    confidence: float
    top3: List[Top3Item]
    is_uncertain: bool
    model_version: str
    feedback_correct: Optional[bool] = None
    corrected_label: Optional[str] = None
    created_at: datetime


class PaginatedPredictions(BaseModel):
    items: List[PredictionRecord]
    page: int
    page_size: int
    total: int


class FeedbackRequest(BaseModel):
    correct: bool
    corrected_label: Optional[str] = None


class DiseaseCount(BaseModel):
    label: str
    count: int


class StatsResponse(BaseModel):
    """Response model for GET /stats (Phase 6). Plain counts for the signed-in
    user; the frontend works out the percentages."""
    total_scans: int
    uncertain_scans: int
    feedback_yes: int
    feedback_no: int
    top_diseases: List[DiseaseCount]