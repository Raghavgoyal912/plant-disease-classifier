"""
ONNX model loading and inference for the plant disease classifier.

Loads model.onnx, labels.json and preprocessing.json (Phase 1 output, see
ml/export/) exactly once at process startup, and exposes predict_image()
for the /predict route. Preprocessing here must match preprocessing.json
exactly, per PROJECT_CONTEXT.md section 8 - it is not reimplemented from
memory, it is read from that file at load time.
"""
import io
import json
from pathlib import Path
from typing import List, Optional, TypedDict

import numpy as np
import onnxruntime as ort
from PIL import Image

from app.config import settings


class Top3Item(TypedDict):
    label: str
    confidence: float


class PredictionResult(TypedDict):
    label: str
    confidence: float
    top3: List[Top3Item]
    is_uncertain: bool


_session: Optional[ort.InferenceSession] = None
_labels: List[str] = []
_preprocessing: dict = {}


def load_model() -> None:
    """Load the ONNX session, labels.json and preprocessing.json once.

    Called from the FastAPI startup event in main.py. Raises if any of the
    three artifacts is missing, so the app fails fast at boot instead of
    serving predictions from a half-loaded model.
    """
    global _session, _labels, _preprocessing

    model_dir = Path(settings.MODEL_DIR)
    model_path = model_dir / "model.onnx"
    labels_path = model_dir / "labels.json"
    preprocessing_path = model_dir / "preprocessing.json"

    for p in (model_path, labels_path, preprocessing_path):
        if not p.exists():
            raise FileNotFoundError(f"Required model artifact not found: {p}")

    _session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])

    with open(labels_path, "r", encoding="utf-8") as f:
        _labels = json.load(f)

    with open(preprocessing_path, "r", encoding="utf-8") as f:
        _preprocessing = json.load(f)


def is_loaded() -> bool:
    return _session is not None


def _preprocess(image_bytes: bytes) -> np.ndarray:
    """Resize, scale, ImageNet mean/std normalize, NCHW - every value read
    from the actual preprocessing.json structure (resize is a dict with
    width/height; normalize is a dict with mean/std; divide_by is top-level),
    not a flattened shape assumed from memory."""
    resize_cfg = _preprocessing.get("resize", {})
    size = (resize_cfg.get("width", 224), resize_cfg.get("height", 224))

    normalize_cfg = _preprocessing.get("normalize", {})
    mean = np.array(normalize_cfg.get("mean", [0.485, 0.456, 0.406]), dtype=np.float32)
    std = np.array(normalize_cfg.get("std", [0.229, 0.224, 0.225]), dtype=np.float32)

    divide_by = float(_preprocessing.get("divide_by", 255.0))

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = image.resize(size, resample=Image.BILINEAR)

    arr = np.asarray(image, dtype=np.float32) / divide_by  # HWC, [0, 1]
    arr = (arr - mean) / std                                # normalize per channel
    arr = arr.transpose(2, 0, 1)                             # HWC -> CHW
    arr = np.expand_dims(arr, axis=0).astype(np.float32)     # add batch -> NCHW
    return arr


def predict_image(image_bytes: bytes) -> PredictionResult:
    """Run inference on raw image bytes; return top-3 + is_uncertain.

    The ONNX output ("probabilities") already has softmax applied, shape
    (batch, 38) - per section 8 this must NOT be softmaxed again here.
    """
    if _session is None:
        raise RuntimeError("Model not loaded. Call load_model() at startup.")

    # Prefer the names declared in preprocessing.json (input_name/output_name);
    # fall back to introspecting the session if either key is missing.
    input_name = _preprocessing.get("input_name") or _session.get_inputs()[0].name
    output_name = _preprocessing.get("output_name") or _session.get_outputs()[0].name

    batch = _preprocess(image_bytes)
    outputs = _session.run([output_name], {input_name: batch})
    probabilities = outputs[0][0]  # shape (38,)

    order = np.argsort(probabilities)[::-1]
    top3: List[Top3Item] = [
        {"label": _labels[i], "confidence": float(probabilities[i])}
        for i in order[:3]
    ]

    top1 = top3[0]
    is_uncertain = top1["confidence"] < settings.CONFIDENCE_THRESHOLD

    return {
        "label": top1["label"],
        "confidence": top1["confidence"],
        "top3": top3,
        "is_uncertain": is_uncertain,
    }
