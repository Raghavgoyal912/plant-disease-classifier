# Plant Disease Classifier

Upload a photo of a plant leaf and a CNN predicts the disease with a confidence score. Every prediction is logged and can be browsed later.

> **Disclaimer:** This tool gives an automated estimate for learning and screening purposes only. It is not a substitute for advice from an agronomist or plant pathologist.

## Stack
Next.js + Tailwind | FastAPI | ONNX Runtime (MobileNetV2) | Supabase | Gemini API

## Repo layout
| Folder | Purpose |
|---|---|
| `ml/` | Training notebook, evaluation, exported `model.onnx` and `labels.json` |
| `backend/` | FastAPI service that serves the model |
| `frontend/` | Next.js web app |
| `docs/` | Design notes and AI prompt log |

## Status
Under development. See `PROJECT_CONTEXT.md` for the current phase and decisions.

## Running locally
Setup instructions are added as each part is built.
