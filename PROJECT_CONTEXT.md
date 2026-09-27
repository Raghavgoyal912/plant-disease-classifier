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

**Note (Phase 4 deviation, see section 8):** the actual Phase 4 frontend was hand-built directly by the AI chat assistant instead of via Stitch → Antigravity, because the user preferred to reuse an already-built implementation rather than repeat a design pass. This section describes the intended pipeline; section 8 records why Phase 4 diverged from it, and section 10 has the follow-up plan.

## 3. Constraints and working rules
- No Claude Code. Backend is written with an AI chat assistant and refined in Antigravity.
- Auth, Highlight.io and deployment are LAST. Until Phase 7 there is no login and RLS is off.
- `user_id` is nullable until Phase 7.
- Everything runs locally first: frontend `localhost:3000`, backend `localhost:8000`.
- Secrets live only in `.env` files (never committed). Supabase service-role key and Gemini key are server-side only.
- Commit to Git after every working step.
- Whenever PROJECT_CONTEXT.md is updated (end of a phase, a bug fix, a decision change), review every section for what needs to change — not just section 4 (status). At minimum check: section 4 (roadmap/status), section 5 (folder structure, if new files were added), section 6 (API contract, if it changed), section 7 (schema, if it changed), section 8 (key decisions, if a new one was made or an assumption was corrected), section 9 (known issues, if one was found or resolved), and section 10 (fill in the phase-prompt template with that phase's actual outcome). Tell the user exactly which sections changed and give the full updated text for each.
- **Before generating or wiring any frontend screen, check section 2b's "who does what" and follow it — don't substitute hand-written screens for the Stitch → Antigravity pipeline without asking first.** (Added after Phase 4 deviated from this once.)

## 4. Roadmap and current status
- [x] Phase 0: Project setup
- [x] Phase 1: Train the model (PlantVillage, MobileNetV2, export ONNX + labels.json)
- [x] Phase 2: Supabase (tables, storage bucket, no auth)
- [x] Phase 3: FastAPI backend (/predict + history endpoints) — see section 9 for a concurrency bug found and fixed after initial sign-off
- [ ] Phase 4: Frontend (Stitch screens, Antigravity wiring)   <- IN PROGRESS, blocked (see below)
- [ ] Phase 5: Gemini features (advice + leaf pre-check)
- [ ] Phase 6: Polish (low-confidence UX, feedback button, filters, stats, evaluation write-up)
- [ ] Phase 7: Auth (Supabase Auth, JWT check in FastAPI, RLS)
- [ ] Phase 8: Ship (Highlight.io, Docker, deploy, README)

**Currently working on:** Phase 4. Functional wiring is done but not checked off yet — two open bugs below block calling it complete, and the visual design is intentionally being left as-is for now (user plans to redo it via Stitch later per section 2b's actual pipeline; the hand-built version was a stopgap, see section 8).

**Last thing that worked:** Frontend (Next.js + Tailwind) built against the real backend contract, confirmed field-for-field from the actual `routes/predictions.py`, `routes/predict.py`, `schemas.py`, `db.py`, `main.py`, `model.py`, and `config.py` (not assumed). `app/page.tsx` (Classify) verified end-to-end with real photos: `POST /predict` returns a genuine top-3 result, and the `is_uncertain` banner correctly triggers below the 0.60 threshold — confirmed on several real-world photos, all landing between 10–25% confidence (see section 9, this is now a confirmed pattern, not a single unlucky test image). `app/history/page.tsx` lists real rows with correct label/confidence/timestamp, after fixing a genuine Phase 3 bug: every handler in `routes/predict.py` and `routes/predictions.py` was declared `async def` while calling fully synchronous Supabase/ONNX code inside — this blocks FastAPI's single event loop for every other request while one is in flight (e.g. History would hang while a Classify call was running). Fixed by converting all five route handlers to plain `def`, so FastAPI runs each in a threadpool instead.

**Current problem(s):**
1. `POST /predict` still takes 15+ seconds in isolation — not a concurrency symptom; confirmed after the async→def fix and a full backend restart. Nothing in `model.py`/`config.py` explains this by itself (ONNX inference on CPU should be sub-second), so the two Supabase network calls inside `predict()` (`db.upload_image`, `db.insert_prediction`) are the leading suspect. A temporarily instrumented `routes/predict.py` (timing prints around file-read, inference, upload, get_public_url, and insert) has been handed to the user; root cause is pending that timing output.
2. History/detail thumbnail images still fail to load even after correctly setting `NEXT_PUBLIC_SUPABASE_URL` in `frontend/.env.local` and restarting the dev server. Root cause not yet found — next step is inspecting the actual `<img>` `src` / Network tab response for one broken image (404 vs 403 vs empty string).

## 5. Folder structure
```
project/
- PROJECT_CONTEXT.md
- README.md
- .gitignore
- ml/          train.ipynb, evaluation/ (metrics.json, confusion_matrix.png, classification_report.txt, training_curves.png), export/ (model.onnx, labels.json, preprocessing.json)
- backend/     FastAPI app
               app/main.py, app/config.py, app/model.py, app/db.py, app/schemas.py
               app/routes/predict.py, app/routes/predictions.py
               app/__init__.py, app/routes/__init__.py
               requirements.txt, .env.example (real .env is gitignored)
- frontend/    Next.js app
               package.json, next.config.mjs, tailwind.config.ts, postcss.config.mjs, tsconfig.json
               .env.local.example (real .env.local is gitignored), .gitignore
               app/layout.tsx, app/globals.css
               app/page.tsx                    (Classify screen)
               app/history/page.tsx            (History screen)
               app/predictions/[id]/page.tsx   (Detail screen)
               lib/api.ts       (typed fetch client — PredictResponse vs PredictionRecord, see section 6)
               lib/format.ts    (label/percent formatting, null-safe)
               lib/storage.ts   (builds a public image URL from image_path)
- docs/        ai-design.md (prompt and decision log)
```
Note: root folder is named `project/` (not `plant-disease-classifier/` as originally planned).

## 6. API contract (confirmed against real backend code, 2026-09-26)
`POST /predict`'s response and the list/detail/feedback responses are **two different shapes** — this wasn't spelled out clearly before and caused a real bug, so it's explicit now.

- `POST /predict` : multipart form, field `file` (image). Returns `PredictResponse`:
  ```
  { id, label, confidence, top3: [{label, confidence}], is_uncertain, image_url, model_version, advice? }
  ```
  `image_url` here is already a full public URL (built server-side via `db.get_public_url`). `advice` is always `null` until Phase 5.

- `GET /predictions?page=&page_size=&label=` : returns `PaginatedPredictions`:
  ```
  { items: PredictionRecord[], page, page_size, total }
  ```

- `GET /predictions/{id}` : returns one `PredictionRecord`.

- `PredictionRecord` shape (used by both endpoints above, and returned by feedback below):
  ```
  { id, image_path, predicted_label, confidence, top3: [{label, confidence}],
    is_uncertain, model_version, feedback_correct?, corrected_label?, created_at }
  ```
  Note the different field names vs. `PredictResponse`: `predicted_label` (not `label`), `image_path` — a raw Supabase Storage path, not a URL (not `image_url`). No `advice` field at all on this shape. The frontend must build the public URL itself from `image_path` (see `lib/storage.ts` / section 8).

- `DELETE /predictions/{id}` : `204 No Content`, empty body.

- `POST /predictions/{id}/feedback` : body `{ correct: bool, corrected_label? }`. Returns the updated `PredictionRecord`.

## 7. Database schema (Supabase Postgres — confirmed matching live `db.py`/`schemas.py`)
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
Storage bucket: `plant-images` (public).

## 8. Key decisions
- FastAPI (not Node) because the model is Python/ONNX.
- ONNX Runtime for inference (small container, no PyTorch at serving time).
- Confidence threshold 0.60: below it, `is_uncertain = true` and the UI asks for a clearer photo.
- Gemini is a supporting tool (advice, leaf check), never the classifier.
- Model loaded once at startup, not per request.
- Train/val/test split is 70/15/15, grouped by source-image id (prefix before `___` in filename) and stratified by class, to reduce near-duplicate leakage between splits.
- Preprocessing is fixed and documented in `ml/export/preprocessing.json`, not reimplemented from memory: resize is a `{width, height, method, keep_aspect_ratio}` object (224x224 bilinear), normalize is a `{mean, std}` object (ImageNet stats), and `divide_by` is a separate top-level float (255.0) — the backend parses these exact nested keys rather than assuming a flat `[224,224]`/`mean`/`std` shape. `input_name`/`output_name` are likewise read from the file ("input"/"probabilities") rather than introspected from the ONNX session, so a future re-export with different I/O names won't silently break inference.
- ONNX model output (`probabilities`) is softmax already applied, shape (batch, 38) - backend must not apply softmax again.
- Labels are raw PlantVillage folder names; labels.json index order matches ONNX output index order. Several labels contain commas/parentheses/spaces (e.g. "Pepper,_bell___Bacterial_spot") - backend must URL-encode when used as a query param.
- model_version = "mnv2-plantvillage-v1", stored in preprocessing.json and written to predictions.model_version on every insert.
- Test accuracy 0.9948 / macro F1 0.9918 on 8,146 held-out PlantVillage images (see section 9 - this is a ceiling, not expected real-world accuracy).
- `plant-images` storage bucket is public (not private + service-role reads) - no auth exists yet, so there's no user to scope access to; revisit alongside RLS in Phase 7.
- Added indexes on `predictions.created_at` (desc) and `predictions.predicted_label` to support the paginated/filtered `GET /predictions` contract in section 6.
- **Root project folder is named `project/`, not `plant-disease-classifier/`** — section 5 corrected to match.
- **All FastAPI route handlers in `routes/predict.py` and `routes/predictions.py` are plain `def`, not `async def`.** Every one of them calls synchronous Supabase-client or ONNX code; wrapping that in `async def` blocks FastAPI's single event loop for every other in-flight request. Plain `def` routes run in a threadpool automatically. This was a real bug (History would hang behind a slow Classify call) found and fixed after Phase 3 was initially marked done — see section 9.
- **`GET /predictions` and `GET /predictions/{id}` return `image_path` (a raw Storage path), not a full URL** — only `POST /predict`'s response already includes one (built server-side via `db.get_public_url`). The frontend reconstructs the public URL itself via `lib/storage.ts`'s `buildImageUrl()`, which needs `NEXT_PUBLIC_SUPABASE_URL` set in `frontend/.env.local` to the real Supabase project URL. (As of this update, thumbnails still aren't loading even with this set — open issue, section 9.)
- **Phase 4's frontend was hand-built directly**, not via Stitch → Antigravity as section 2b describes, because the user chose to reuse an already-built implementation rather than repeat the design step. The user has said they don't like the current visual design and plans to redo the three screens' UI via Stitch later; the wiring/logic files (`lib/api.ts`, `lib/format.ts`, `lib/storage.ts`) are expected to carry over unchanged into that redesign, since they're plumbing, not visual design.

## 9. Known issues and next steps
- PlantVillage images are lab-style; the 99.48% test accuracy is on held-out images from the same distribution, not real phone photos. **Now confirmed as a real pattern, not a one-off**: multiple real-world test photos (natural lighting, cluttered/dark backgrounds, visible insect damage) all landed at 10–25% confidence with scattered, unrelated top-3 labels. `is_uncertain` correctly flags all of them rather than hiding them, but expect a meaningfully lower real-world accuracy than the reported test number, and plan real-world-style UX (Phase 6) accordingly.
- Grouped split (by source-image id) reduces but doesn't fully eliminate near-duplicate leakage, so true generalization is somewhat below the reported test number.
- Weakest classes (still >93% F1), worth extra attention in real-world testing: Potato___healthy, Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot, Tomato___Early_blight, Tomato___Late_blight, Corn_(maize)___Northern_Leaf_Blight.
- disease_info.label (Phase 5) must match labels.json strings exactly, character-for-character - generate seed rows from labels.json programmatically rather than retyping, to avoid a silent lookup mismatch.
- **Resolved:** `routes/predict.py` and `routes/predictions.py` had `async def` handlers wrapping synchronous Supabase/ONNX calls, blocking the whole server per-request. Fixed by converting all five handlers to plain `def`.
- **Open:** `POST /predict` takes 15+ seconds in isolation, even after the fix above. Suspected cause is the Supabase upload/insert calls inside `predict()`, not the model — needs the timing breakdown from the instrumented `routes/predict.py` handed to the user (prints time for file-read, `model.predict_image`, `db.upload_image`, `db.get_public_url`, `db.insert_prediction`).
- **Open:** History/detail thumbnails don't load, even with `NEXT_PUBLIC_SUPABASE_URL` correctly set and the frontend dev server restarted. Next step: inspect the actual `<img>` `src` being rendered and the Network tab response for that image request (404 / 403 / empty string all point to different causes).
- Next: resolve both open issues above, then start Phase 5 (Gemini leaf pre-check + advice generation, scoped together per the user's choice) — see section 10 for the ready-to-use starter prompt.

## 10. Next session starter prompt
Copy everything below (with the current PROJECT_CONTEXT.md pasted in) to start the next session.

```
I'm building a Plant Disease Classifier web app. Below is my PROJECT_CONTEXT.md,
which is the source of truth for the project. Read it fully before answering,
including the architecture section and the working rules.

[PASTE THE FULL CONTENTS OF PROJECT_CONTEXT.md HERE]

CURRENT PHASE: finish Phase 4 (open bugs), then Phase 5 (Gemini leaf pre-check + advice)
WHAT I'M DOING RIGHT NOW: two Phase 4 bugs are still open and must be fixed first -
see section 4 "Current problem(s)" and section 9. Do not start Phase 5 work until
both are resolved and confirmed working by me.
BACKEND PLATFORM: local venv (backend from Phase 3 running on localhost:8000,
frontend from Phase 4 running on localhost:3000)
PROBLEM OR TASK:
1. First, help me finish diagnosing and fixing the two open issues in section 4:
   (a) POST /predict taking 15+ seconds - I will share the timing output from the
       instrumented routes/predict.py you gave me; use it to find the real slow
       step and fix it, then revert the instrumentation.
   (b) History/detail thumbnails not loading even with NEXT_PUBLIC_SUPABASE_URL
       set correctly - help me inspect the actual broken image URL and fix
       whatever mismatch is causing it.
2. Once both are confirmed fixed and I've verified them myself, start Phase 5 per
   section 2b and section 6: add the Gemini "is this a leaf?" pre-check to
   POST /predict (reject non-leaf images before running ONNX inference), and add
   Gemini-generated advice via the disease_info table (cached; call Gemini only
   on a cache miss), returned in PredictResponse.advice.
3. Note: the Phase 4 frontend's visual design was hand-built directly rather than
   through Stitch (see section 8) and I plan to redo the 3 screens' UI via Stitch
   later. Do not redesign the frontend as part of Phase 5 - only wire the new
   `advice` field into the existing result card, minimally.

RULES
- Follow section 2b's "who does what" - if a task belongs to Stitch, Antigravity,
  Google AI Studio, or another named tool/person, say so and don't silently do it
  yourself instead. Ask me first if you're unsure whose job something is.
- Only work on the current phase (finishing Phase 4's bugs, then Phase 5). Do not
  start Phase 6/7/8 work.
- Follow the folder structure, file names and paths in PROJECT_CONTEXT.md exactly
  - root folder is `project/`, not `plant-disease-classifier/`.
- Before assuming any API response shape, check section 6 - it is now confirmed
  against the real backend code, not guessed. If you still need to guess something
  not covered there, tell me explicitly and ask, rather than assuming silently.
- If something conflicts with PROJECT_CONTEXT.md, stop and ask me first.
- Give complete code for the file being changed, and explain what each part does.
- At the end, tell me exactly which sections of PROJECT_CONTEXT.md changed and
  give the full updated text for each - not just instructions to edit it myself.
```
