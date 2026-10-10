"""Advice lookup for the Detail screen: GET /disease-info/{label}.

Read-only. Returns the cached advice row from `disease_info` (Phase 5 cache).
Never calls Gemini and never writes to the database. A row counts as a hit
only if all four text fields are non-empty (PROJECT_CONTEXT.md section 8).
Global data (not per-user), but requires login since Phase 7.
Plain `def`, not `async def`, because the Supabase client is synchronous.
"""
from fastapi import APIRouter, Depends, HTTPException

from app import db
from app.auth import get_current_user
from app.schemas import DiseaseInfoResponse

router = APIRouter()

_FIELDS = ("summary", "symptoms", "treatment", "prevention")


@router.get(
    "/disease-info/{label}",
    response_model=DiseaseInfoResponse,
    dependencies=[Depends(get_current_user)],
)
def get_disease_info(label: str) -> DiseaseInfoResponse:
    # `label` arrives URL-decoded, so raw PlantVillage strings with commas,
    # parentheses and spaces match labels.json exactly.
    row = db.get_disease_info(label)
    if row is None or not all((row.get(f) or "").strip() for f in _FIELDS):
        raise HTTPException(status_code=404, detail="No advice cached for this label.")
    return DiseaseInfoResponse(**{f: row[f] for f in _FIELDS})