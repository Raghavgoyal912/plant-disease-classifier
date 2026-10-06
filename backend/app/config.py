"""
Centralized settings, loaded from environment variables / a local .env file.
See .env.example for the full list of variables this expects.

Per PROJECT_CONTEXT.md section 3: secrets live only in .env (never committed),
and the Supabase service-role key and Gemini key are server-side only.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase (Phase 2 tables/bucket already exist; RLS is off until Phase 7)
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_STORAGE_BUCKET: str = "plant-images"

    # Gemini (Phase 5: leaf pre-check + advice). Server-side only.
    # If GEMINI_API_KEY is empty, both Gemini features are skipped (the leaf
    # check fails open, advice is null) and the backend still starts.
    GEMINI_API_KEY: str = ""
    # Set GEMINI_MODEL in .env to the exact model ID you tested your prompts
    # with in Google AI Studio. (gemini-2.5-* models are scheduled to shut
    # down on 2026-10-16, so do not use them.)
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"
    GEMINI_TIMEOUT_SECONDS: float = 10.0

    # Model artifacts (Phase 1 output, see ml/export/)
    MODEL_DIR: str = "../ml/export"  # path is relative to the backend/ working directory
    MODEL_VERSION: str = "mnv2-plantvillage-v1"
    CONFIDENCE_THRESHOLD: float = 0.60

    # Upload validation
    MAX_UPLOAD_MB: int = 10
    ALLOWED_CONTENT_TYPES: tuple[str, ...] = ("image/jpeg", "image/png", "image/webp")

    # CORS - frontend runs on localhost:3000 per section 3
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()