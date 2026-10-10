"""POST /predict - the core inference endpoint (section 6).

Pipeline (section 2b): authenticate -> validate -> [Phase 5] Gemini leaf
pre-check -> ONNX inference -> upload image + insert row -> [Phase 5] advice
from the disease_info cache (Gemini only on a cache miss).

Auth runs first (FastAPI dependency), so an unauthenticated request never
reaches Gemini or storage.

The [TIMING] prints are kept deliberately (they were added to diagnose the
Phase 4 latency issue, now resolved) so the cost of the two Gemini calls stays
visible.
"""
import time
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app import db, gemini, model
from app.auth import get_current_user
from app.config import settings
from app.schemas import Advice, PredictResponse

router = APIRouter()

_ADVICE_FIELDS = ("summary", "symptoms", "treatment", "prevention")


def _get_advice(label: str) -> Optional[Advice]:
    """Advice for one label: disease_info cache first, Gemini only on a miss.
    Never raises - the prediction is already saved by the time this runs, so
    an advice problem must not turn a successful classification into an error."""
    try:
        row = db.get_disease_info(label)
        if row and all(row.get(f) for f in _ADVICE_FIELDS):
            print(f"[ADVICE] cache hit for {label!r}")
            return Advice(**{f: row[f] for f in _ADVICE_FIELDS})
    except Exception as exc:
        print(f"[ADVICE] disease_info lookup failed ({exc}); trying Gemini")

    print(f"[ADVICE] cache miss for {label!r} - calling Gemini")
    advice = gemini.generate_advice(label)
    if advice is None:
        return None

    try:
        db.upsert_disease_info(label, advice.model_dump())
    except Exception as exc:
        # Still return the advice we just generated; it just won't be cached.
        print(f"[ADVICE] failed to cache advice for {label!r}: {exc}")
    return advice


@router.post("/predict", response_model=PredictResponse)
def predict(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
) -> PredictResponse:
    if file.content_type not in settings.ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: {settings.ALLOWED_CONTENT_TYPES}",
        )

    t_start = time.perf_counter()

    # Synchronous read (not `await file.read()`) - this route is a plain
    # `def`, which FastAPI runs in a threadpool instead of on the event loop,
    # so a slow Gemini/ONNX/Supabase call here doesn't block other requests
    # (e.g. GET /predictions) while it's running.
    image_bytes = file.file.read()
    t_read = time.perf_counter()
    print(f"[TIMING] file-read:           {t_read - t_start:.3f}s")

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(image_bytes) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_UPLOAD_MB} MB limit.")

    # Phase 5: Gemini leaf pre-check. None = check couldn't run -> fail open.
    # A rejected image is not run through ONNX, not uploaded, and not saved.
    leaf_check = gemini.check_is_leaf(image_bytes, file.content_type)
    t_leaf = time.perf_counter()
    print(f"[TIMING] gemini.check_is_leaf:{t_leaf - t_read:.3f}s")
    if leaf_check is None:
        print("[LEAF CHECK] skipped (Gemini unavailable) - continuing")
    elif not leaf_check.is_leaf:
        print(f"[LEAF CHECK] rejected: {leaf_check.reason}")
        raise HTTPException(
            status_code=422,
            detail={
                "code": "not_a_leaf",
                "message": "This doesn't look like a plant leaf. Please upload a clear photo of a single leaf.",
            },
        )

    try:
        result = model.predict_image(image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}") from exc
    t_infer = time.perf_counter()
    print(f"[TIMING] model.predict_image: {t_infer - t_leaf:.3f}s")

    image_path = db.upload_image(user_id, image_bytes, file.content_type)
    t_upload = time.perf_counter()
    print(f"[TIMING] db.upload_image:     {t_upload - t_infer:.3f}s")

    # Private bucket: the frontend gets a signed URL that expires in 1 hour.
    image_url = db.create_signed_url(image_path)
    t_url = time.perf_counter()
    print(f"[TIMING] db.create_signed_url:{t_url - t_upload:.3f}s")
    if image_url is None:
        raise HTTPException(status_code=500, detail="Could not create image URL.")

    row = db.insert_prediction(
        user_id,
        {
            "image_path": image_path,
            "predicted_label": result["label"],
            "confidence": result["confidence"],
            "top3": result["top3"],
            "is_uncertain": result["is_uncertain"],
            "model_version": settings.MODEL_VERSION,
        },
    )
    t_insert = time.perf_counter()
    print(f"[TIMING] db.insert_prediction:{t_insert - t_url:.3f}s")

    # Phase 5: advice. Skipped when uncertain - the top label is probably
    # wrong, so advice for it would be misleading.
    advice = None if row["is_uncertain"] else _get_advice(row["predicted_label"])
    t_advice = time.perf_counter()
    print(f"[TIMING] advice:              {t_advice - t_insert:.3f}s")
    print(f"[TIMING] TOTAL:               {t_advice - t_start:.3f}s")

    return PredictResponse(
        id=row["id"],
        label=row["predicted_label"],
        confidence=row["confidence"],
        top3=row["top3"],
        is_uncertain=row["is_uncertain"],
        image_url=image_url,
        model_version=row["model_version"],
        advice=advice,
    )