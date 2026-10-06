"""
Pydantic request/response models matching the API contract in
PROJECT_CONTEXT.md section 6. No user_id field yet - that arrives in Phase 7.
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


class PredictResponse(BaseModel):
    id: str
    label: str
    confidence: float
    top3: List[Top3Item]
    is_uncertain: bool
    image_url: str
    model_version: str
    # Phase 5: null when the prediction is uncertain, or when Gemini/cache
    # lookup is unavailable. Never present on PredictionRecord.
    advice: Optional[Advice] = None


class PredictionRecord(BaseModel):
    id: str
    image_path: str
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