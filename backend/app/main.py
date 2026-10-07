"""
FastAPI entrypoint. Loads the ONNX model once at startup and wires up the
/predict and /predictions routers. No auth, no Gemini - those are Phase 7
and Phase 5 respectively (see PROJECT_CONTEXT.md section 4).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import model
from app.config import settings
from app.routes import disease_info, predict, predictions

app = FastAPI(title="Plant Disease Classifier API", version=settings.MODEL_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router)
app.include_router(predictions.router)
app.include_router(disease_info.router)


@app.on_event("startup")
def on_startup() -> None:
    model.load_model()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model_loaded": model.is_loaded()}
