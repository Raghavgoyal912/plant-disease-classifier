"""POST /predict - the core inference endpoint (section 6)."""
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

    # Synchronous read (not `await file.read()`) - this route is now a plain
    # `def`, which FastAPI runs in a threadpool instead of on the event loop,
    # so a slow ONNX inference or Supabase call here no longer blocks every
    # other request (e.g. GET /predictions) while it's running.
    image_bytes = file.file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(image_bytes) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_UPLOAD_MB} MB limit.")

    try:
        result = model.predict_image(image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}") from exc

    image_path = db.upload_image(image_bytes, file.content_type)
    image_url = db.get_public_url(image_path)

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