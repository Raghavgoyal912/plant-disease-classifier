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

## 3. Constraints and working rules
- No Claude Code. Backend is written with an AI chat assistant and refined in Antigravity.
- Auth, Highlight.io and deployment are LAST. Until Phase 7 there is no login and RLS is off.
- `user_id` is nullable until Phase 7.
- Everything runs locally first: frontend `localhost:3000`, backend `localhost:8000`.
- Secrets live only in `.env` files (never committed). Supabase service-role key and Gemini key are server-side only.
- Commit to Git after every working step.

## 4. Roadmap and current status
- [ ] Phase 0: Project setup   <- IN PROGRESS
- [ ] Phase 1: Train the model (PlantVillage, MobileNetV2, export ONNX + labels.json)
- [ ] Phase 2: Supabase (tables, storage bucket, no auth)
- [ ] Phase 3: FastAPI backend (/predict + history endpoints)
- [ ] Phase 4: Frontend (Stitch screens, Antigravity wiring)
- [ ] Phase 5: Gemini features (advice + leaf pre-check)
- [ ] Phase 6: Polish (low-confidence UX, feedback button, filters, stats, evaluation write-up)
- [ ] Phase 7: Auth (Supabase Auth, JWT check in FastAPI, RLS)
- [ ] Phase 8: Ship (Highlight.io, Docker, deploy, README)

**Currently working on:** Phase 0
**Last thing that worked:** (update after each step)
**Current problem, if any:** none

## 5. Folder structure
```
plant-disease-classifier/
  PROJECT_CONTEXT.md
  README.md
  .gitignore
  ml/          training notebook, evaluation, export/ (model.onnx, labels.json)
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

## 9. Known issues and next steps
- PlantVillage images are lab-style; accuracy on real phone photos will be lower. Test and report this honestly.
- Next: Phase 1, training notebook.
