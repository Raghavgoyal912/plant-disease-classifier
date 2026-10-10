"""Stats for the stats page: GET /stats (Phase 6).

Read-only counts over the `predictions` table. Never calls Gemini and never
writes. Plain `def`, not `async def`, because the Supabase client is
synchronous (PROJECT_CONTEXT.md section 8).
"""
from fastapi import APIRouter

from app import db
from app.schemas import StatsResponse

router = APIRouter()


@router.get("/stats", response_model=StatsResponse)
def stats() -> StatsResponse:
    return StatsResponse(**db.get_stats())
