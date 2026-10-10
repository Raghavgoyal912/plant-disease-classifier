"""Stats for the stats page: GET /stats (Phase 6, per-user since Phase 7).

Read-only counts over the signed-in user's rows in `predictions`. Never calls
Gemini and never writes. Plain `def`, not `async def`, because the Supabase
client is synchronous (PROJECT_CONTEXT.md section 8).
"""
from fastapi import APIRouter, Depends

from app import db
from app.auth import get_current_user
from app.schemas import StatsResponse

router = APIRouter()


@router.get("/stats", response_model=StatsResponse)
def stats(user_id: str = Depends(get_current_user)) -> StatsResponse:
    return StatsResponse(**db.get_stats(user_id))