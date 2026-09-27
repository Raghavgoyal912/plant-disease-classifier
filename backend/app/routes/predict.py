"""POST /predict - the core inference endpoint (section 6).

TEMPORARY: timing instrumentation added to diagnose the 15+ second latency
(section 4 / section 9, open issue #1). Revert once root cause is found.
"""
import time

from fastapi import APIRouter, File, HTTPException, UploadFile

from app import db, model
from app.config import settings
from app.schemas import PredictResponse

router = APIRouter()


@router.post("/predict", response_model=PredictResponse)
def predict(file: UploadFile = File(...)) -> PredictResponse:
    if file.content_type not in settings.ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: {settings.ALLOWED_CONTENT_TYPES}",
        )

    t_start = time.perf_counter()

    # Synchronous read (not `await file.read()`) - this route is now a plain
    # `def`, which FastAPI runs in a threadpool instead of on the event loop,
    # so a slow ONNX inference or Supabase call here no longer blocks every
    # other request (e.g. GET /predictions) while it's running.
    image_bytes = file.file.read()
    t_read = time.perf_counter()
    print(f"[TIMING] file-read:          {t_read - t_start:.3f}s")

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(image_bytes) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_UPLOAD_MB} MB limit.")

    try:
        result = model.predict_image(image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}") from exc
    t_infer = time.perf_counter()
    print(f"[TIMING] model.predict_image: {t_infer - t_read:.3f}s")

    image_path = db.upload_image(image_bytes, file.content_type)
    t_upload = time.perf_counter()
    print(f"[TIMING] db.upload_image:     {t_upload - t_infer:.3f}s")

    image_url = db.get_public_url(image_path)
    t_url = time.perf_counter()
    print(f"[TIMING] db.get_public_url:   {t_url - t_upload:.3f}s")

    row = db.insert_prediction(
        {
            "image_path": image_path,
            "predicted_label": result["label"],
            "confidence": result["confidence"],
            "top3": result["top3"],
            "is_uncertain": result["is_uncertain"],
            "model_version": settings.MODEL_VERSION,
        }
    )
    t_insert = time.perf_counter()
    print(f"[TIMING] db.insert_prediction:{t_insert - t_url:.3f}s")
    print(f"[TIMING] TOTAL:               {t_insert - t_start:.3f}s")

    return PredictResponse(
        id=row["id"],
        label=row["predicted_label"],
        confidence=row["confidence"],
        top3=row["top3"],
        is_uncertain=row["is_uncertain"],
        image_url=image_url,
        model_version=row["model_version"],
        advice=None,
    )