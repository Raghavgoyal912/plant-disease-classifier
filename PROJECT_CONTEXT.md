# PROJECT_CONTEXT.md: Plant Disease Classifier

> **For any AI assistant reading this:** this file is the source of truth for the project. Read it fully before answering. Follow the API contract and folder structure below. When you change something that affects this file, tell the user exactly what to update here. Give complete code for the file being changed, and keep files small with one job each.

## 1. What this is
A web app where a user uploads a plant-leaf image; a CNN predicts the disease class with a confidence score; every prediction is stored and can be browsed later. Gemini adds plain-language advice and an "is this a leaf?" check. Includes a clear disclaimer (not professional agronomic advice).

## 2. Stack
| Layer | Tool |
|---|---|
| Frontend | Next.js + Tailwind (screens designed in Stitch, developed in Antigravity IDE) |
| Backend | FastAPI (Python) |
| Model | MobileNetV2 transfer learning on PlantVillage, exported to ONNX, served with ONNX Runtime |
| AI assist | Google AI Studio / Gemini API (advice + leaf pre-check) |
| Database | Supabase (Postgres + Storage) |
| Auth | Supabase Auth (email OTP + Google), added in Phase 7 |
| Observability | Highlight.io (Phase 8) |
| Deploy | Vercel (frontend), Render/Railway (API), Supabase (DB), added in Phase 8 |

## 2b. Architecture

Browser (Next.js + Tailwind, localhost:3000)
   |  POST /predict (multipart image)
   v
FastAPI (localhost:8000)
   |-- 1. validate image (type, size)
   |-- 2. [Phase 5] Gemini leaf pre-check -> reject if not a leaf
   |-- 3. preprocess (see ml/export/preprocessing.json) and run ONNX model
   |-- 4. top-3 + confidence; is_uncertain if top confidence < threshold
   |-- 5. upload image to Supabase Storage, insert row in predictions
   |-- 6. [Phase 5] fetch/generate advice from disease_info (cached; Gemini only on cache miss)
   v
Response JSON -> result card. History page reads via GET /predictions.

### Who does what
- Stitch: designs the 3 screens (upload+result, history, detail), exports React/Tailwind.
- Antigravity IDE: moves screens into Next.js and wires them to the API.
- Google AI Studio: prototype and test Gemini prompts (advice, leaf check) before they go in the backend.
- Supabase: Postgres for predictions and disease_info, Storage for images. Auth and RLS come in Phase 7.
- ONNX Runtime: the only thing that classifies. Gemini never classifies.
- AI chat assistant: writes backend and ML code from this file.
- Highlight.io: errors and session replay, Phase 8 only.

## 3. Constraints and working rules
- No Claude Code. Backend is written with an AI chat assistant and refined in Antigravity.
- Auth, Highlight.io and deployment are LAST. Until Phase 7 there is no login and RLS is off.
- `user_id` is nullable until Phase 7.
- Everything runs locally first: frontend `localhost:3000`, backend `localhost:8000`.
- Secrets live only in `.env` files (never committed). Supabase service-role key and Gemini key are server-side only.
- Commit to Git after every working step.

## 4. Roadmap and current status
- [x] Phase 0: Project setup
- [x] Phase 1: Train the model (PlantVillage, MobileNetV2, export ONNX + labels.json)
- [ ] Phase 2: Supabase (tables, storage bucket, no auth)   <- IN PROGRESS
- [ ] Phase 3: FastAPI backend (/predict + history endpoints)
- [ ] Phase 4: Frontend (Stitch screens, Antigravity wiring)
- [ ] Phase 5: Gemini features (advice + leaf pre-check)
- [ ] Phase 6: Polish (low-confidence UX, feedback button, filters, stats, evaluation write-up)
- [ ] Phase 7: Auth (Supabase Auth, JWT check in FastAPI, RLS)
- [ ] Phase 8: Ship (Highlight.io, Docker, deploy, README)

**Currently working on:** Phase 2
**Last thing that worked:** Phase 1 complete. Trained MobileNetV2 (transfer learning) on PlantVillage, 38 classes, 8,146 held-out test images. Test accuracy 0.9948, macro F1 0.9918, top-3 accuracy 0.9996. Exported ml/export/model.onnx (9.1 MB, softmax output), labels.json (38 labels), preprocessing.json. ONNX export verified against PyTorch: 100% prediction agreement, max prob diff 1.88e-06. Weakest classes by F1: Potato___healthy (0.9302), Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot (0.9474).
**Current problem, if any:** none

## 5. Folder structure
```
plant-disease-classifier/
  PROJECT_CONTEXT.md
  README.md
  .gitignore
  ml/          train.ipynb, evaluation/ (metrics.json, confusion_matrix.png, classification_report.txt, training_curves.png), export/ (model.onnx, labels.json, preprocessing.json)
  backend/     FastAPI app (planned: app/main.py, app/model.py, app/db.py, app/routes/)
  frontend/    Next.js app
  docs/        ai-design.md (prompt and decision log)
```

## 6. API contract (planned; update if it changes)
- `POST /predict` : multipart form, field `file` (image). Returns
  `{ id, label, confidence, top3: [{label, confidence}], is_uncertain, image_url, model_version, advice? }`
- `GET /predictions?page=&page_size=&label=` : paginated history
- `GET /predictions/{id}` : one prediction
- `DELETE /predictions/{id}`
- `POST /predictions/{id}/feedback` : `{ correct: bool, corrected_label? }`

## 7. Database schema (planned; Supabase Postgres)
```sql
create table predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,                     -- becomes NOT NULL + FK to auth.users in Phase 7
  image_path text not null,
  predicted_label text not null,
  confidence real not null,
  top3 jsonb not null,
  is_uncertain boolean not null default false,
  model_version text not null,
  feedback_correct boolean,
  corrected_label text,
  created_at timestamptz not null default now()
);

create table disease_info (
  label text primary key,
  summary text, symptoms text, treatment text, prevention text,
  generated_by text default 'gemini',
  updated_at timestamptz default now()
);
```
Storage bucket: `plant-images`.

## 8. Key decisions
- FastAPI (not Node) because the model is Python/ONNX.
- ONNX Runtime for inference (small container, no PyTorch at serving time).
- Confidence threshold 0.60: below it, `is_uncertain = true` and the UI asks for a clearer photo.
- Gemini is a supporting tool (advice, leaf check), never the classifier.
- Model loaded once at startup, not per request.
- Train/val/test split is 70/15/15, grouped by source-image id (prefix before `___` in filename) and stratified by class, to reduce near-duplicate leakage between splits.
- Preprocessing is fixed and documented in ml/export/preprocessing.json (resize 224x224 bilinear, /255, ImageNet mean/std normalize, NCHW) - the backend must copy this exactly, not reimplement it from memory.
- ONNX model output (`probabilities`) is softmax already applied, shape (batch, 38) - backend must not apply softmax again.
- Labels are raw PlantVillage folder names; labels.json index order matches ONNX output index order. Several labels contain commas/parentheses/spaces (e.g. "Pepper,_bell___Bacterial_spot") - backend must URL-encode when used as a query param.
- model_version = "mnv2-plantvillage-v1", stored in preprocessing.json and written to predictions.model_version on every insert.
- Test accuracy 0.9948 / macro F1 0.9918 on 8,146 held-out PlantVillage images (see section 9 - this is a ceiling, not expected real-world accuracy).
## 9. Known issues and next steps
- PlantVillage images are lab-style; the 99.48% test accuracy is on held-out images from the same distribution, not real phone photos. Treat it as a ceiling - expect a meaningfully lower number in Phase 6 real-world testing, and report that honestly.
- Grouped split (by source-image id) reduces but doesn't fully eliminate near-duplicate leakage, so true generalization is somewhat below the reported test number.
- Weakest classes (still >93% F1), worth extra attention in real-world testing: Potato___healthy, Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot, Tomato___Early_blight, Tomato___Late_blight, Corn_(maize)___Northern_Leaf_Blight.
- disease_info.label (Phase 5) must match labels.json strings exactly, character-for-character - generate seed rows from labels.json programmatically rather than retyping, to avoid a silent lookup mismatch.
- Next: Phase 2, Supabase (predictions + disease_info tables, plant-images storage bucket, no auth yet - user_id stays nullable).