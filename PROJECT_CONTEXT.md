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
- Stitch: designs the 3 screens (upload+result, history, detail), exports React/Tailwind. For Phase 6b, also used for motion-forward visual design and kinetic UI concepts, but actual animation implementation (Framer Motion) happens in Antigravity, not Stitch itself - Stitch's animation output is concept/static, not production interaction code.
- Antigravity IDE: moves screens into Next.js and wires them to the API. For Phase 6b, also implements real animations (Framer Motion / motion/react) on top of Stitch's motion-forward designs.
- Google AI Studio: prototype and test Gemini prompts (advice, leaf check) before they go in the backend.
- Supabase: Postgres for predictions and disease_info, Storage for images. Auth and RLS come in Phase 7.
- ONNX Runtime: the only thing that classifies. Gemini never classifies.
- AI chat assistant: writes backend and ML code from this file.
- Highlight.io: errors and session replay, Phase 8 only.

**Note (Phase 4 deviation, see section 8):** the actual Phase 4 frontend was hand-built directly by the AI chat assistant instead of via Stitch → Antigravity, because the user preferred to reuse an already-built implementation rather than repeat a design pass. This section describes the intended pipeline; section 8 records why Phase 4 diverged from it, and Phase 6b (section 4) is when the real Stitch → Antigravity pipeline is picked back up for the visual/motion redesign.

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
- [x] Phase 4: Frontend (Stitch screens, Antigravity wiring) — functional wiring complete, both open bugs resolved (see section 9). Visual design intentionally left as the hand-built stopgap (section 8); real redesign deferred to Phase 6b.
- [ ] Phase 5: Gemini features (advice + leaf pre-check)   <- IN PROGRESS
- [ ] Phase 6: Polish (low-confidence UX, feedback button, filters, stats, evaluation write-up)
- [ ] Phase 6b: Motion frontend redesign — redo the 3 screens via Stitch with a motion-forward direction (see section 8 for what Stitch can/can't do here), then implement real animations (Framer Motion) in Antigravity. Scheduled after Polish, before Auth.
- [ ] Phase 7: Auth (Supabase Auth, JWT check in FastAPI, RLS)
- [ ] Phase 8: Ship (Highlight.io, Docker, deploy, README)

**Currently working on:** Phase 5 — Gemini leaf pre-check on `POST /predict`, plus Gemini-generated advice via `disease_info` (cached, Gemini only on cache miss), returned in `PredictResponse.advice`. Per the user's note, only wire the `advice` field into the existing result card minimally — no frontend redesign as part of this phase (that's Phase 6b).

**Last thing that worked:** `POST /predict` end-to-end in ~5.5s total (file-read 0.02s, inference 0.8s, `db.upload_image` 4.2s, `db.get_public_url` ~0s, `db.insert_prediction` 0.45s) — confirmed by the user after the IPv4-only DNS fix (section 8/9). History and Detail pages both confirmed rendering real thumbnails correctly with no image-loading issue.

**Current problem(s):** none open. Both Phase 4 bugs (section 9) are resolved and user-confirmed.

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
- **`GET /predictions` and `GET /predictions/{id}` return `image_path` (a raw Storage path), not a full URL** — only `POST /predict`'s response already includes one (built server-side via `db.get_public_url`). The frontend reconstructs the public URL itself via `lib/storage.ts`'s `buildImageUrl()`, which needs `NEXT_PUBLIC_SUPABASE_URL` set in `frontend/.env.local` to the real Supabase project URL. Confirmed working correctly on both History and Detail pages (section 9) — the earlier suspected bug did not reproduce once actually inspected.
- **Phase 4's frontend was hand-built directly**, not via Stitch → Antigravity as section 2b describes, because the user chose to reuse an already-built implementation rather than repeat the design step. The wiring/logic files (`lib/api.ts`, `lib/format.ts`, `lib/storage.ts`) are expected to carry over unchanged into the Phase 6b redesign, since they're plumbing, not visual design.
- **IPv4-only DNS resolution workaround, added in `db.py` (2026-09-27):** the dev machine's network resolves the Supabase host to two IPv6 addresses in the `64:ff9b::/96` NAT64-synthesized range, which aren't actually routable here. The OS tried those first on every new connection, hanging ~21s each (~43s total) before falling back to the real IPv4 address — this, not the ONNX model, was the entire cause of the 15+ second `/predict` latency (confirmed via a standalone socket-level diagnostic: forced-IPv4 connects in ~0.06s vs ~42s default). Fixed by monkey-patching `socket.getaddrinfo` in `db.py` to filter out non-IPv4 results at import time. Environment-specific — worth re-checking once deployed to Render/Railway in Phase 8 (harmless to leave in either way).
- **Stitch's motion/animation capability is limited, confirmed via research (2026-09-27):** Stitch can generate motion-forward visual concepts and "kinetic UI," but does not produce production animation code — reviews are consistent that real interaction/animation implementation still needs a dedicated tool. Decision: Phase 6b will use Stitch for the visual redesign direction, then implement actual animations with Framer Motion (`motion/react`) in Antigravity, same division of labor as the existing Stitch → Antigravity pipeline.

## 9. Known issues and next steps
- PlantVillage images are lab-style; the 99.48% test accuracy is on held-out images from the same distribution, not real phone photos. **Now confirmed as a real pattern, not a one-off**: multiple real-world test photos (natural lighting, cluttered/dark backgrounds, visible insect damage) all landed at 10–25% confidence with scattered, unrelated top-3 labels. `is_uncertain` correctly flags all of them rather than hiding them, but expect a meaningfully lower real-world accuracy than the reported test number, and plan real-world-style UX (Phase 6) accordingly.
- Grouped split (by source-image id) reduces but doesn't fully eliminate near-duplicate leakage, so true generalization is somewhat below the reported test number.
- Weakest classes (still >93% F1), worth extra attention in real-world testing: Potato___healthy, Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot, Tomato___Early_blight, Tomato___Late_blight, Corn_(maize)___Northern_Leaf_Blight.
- disease_info.label (Phase 5) must match labels.json strings exactly, character-for-character - generate seed rows from labels.json programmatically rather than retyping, to avoid a silent lookup mismatch.
- **Resolved:** `routes/predict.py` and `routes/predictions.py` had `async def` handlers wrapping synchronous Supabase/ONNX calls, blocking the whole server per-request. Fixed by converting all five handlers to plain `def`.
- **Resolved:** `POST /predict` took 15+ seconds even after the async→def fix. Root cause: broken NAT64 IPv6 address resolution to the Supabase host on this network, adding ~43s per connection (see section 8). Fixed via an IPv4-only DNS patch in `db.py`. Confirmed by the user: total request time now ~5.5s.
- **Resolved:** History/detail thumbnails were suspected broken but turned out to be loading correctly on both the History and Detail pages once actually checked — no code change was needed.
- Next: Phase 5 (Gemini leaf pre-check + advice generation) is in progress. Phase 6b (motion frontend redesign) is scheduled after Phase 6 Polish, before Phase 7 Auth — see section 8 for the Stitch + Framer Motion approach.

## 10. Next session starter prompt
Copy everything below (with the current PROJECT_CONTEXT.md pasted in) to start the next session.

```
I'm building a Plant Disease Classifier web app. Below is my PROJECT_CONTEXT.md,
which is the source of truth for the project. Read it fully before answering,
including the architecture section and the working rules.

[PASTE THE FULL CONTENTS OF PROJECT_CONTEXT.md HERE]

CURRENT PHASE: Phase 5 (Gemini leaf pre-check + advice), then Phase 6, then Phase 6b
(motion frontend redesign via Stitch + Framer Motion), then Phase 7 (Auth)
WHAT I'M DOING RIGHT NOW: Phase 4 is fully complete (both bugs resolved and confirmed).
Currently building Phase 5: Gemini leaf pre-check + advice generation.
BACKEND PLATFORM: local venv (backend from Phase 3 running on localhost:8000,
frontend from Phase 4 running on localhost:3000)
PROBLEM OR TASK:
1. Add the Gemini "is this a leaf?" pre-check to POST /predict per section 2b and
   section 6 (reject non-leaf images before running ONNX inference).
2. Add Gemini-generated advice via the disease_info table (cached; call Gemini only
   on a cache miss), returned in PredictResponse.advice.
3. Only wire the new `advice` field into the existing result card, minimally - do
   not redesign the frontend as part of Phase 5 (that's Phase 6b, later).

RULES
- Follow section 2b's "who does what" - if a task belongs to Stitch, Antigravity,
  Google AI Studio, or another named tool/person, say so and don't silently do it
  yourself instead. Ask me first if you're unsure whose job something is.
- Only work on the current phase (Phase 5). Do not start Phase 6/6b/7/8 work.
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