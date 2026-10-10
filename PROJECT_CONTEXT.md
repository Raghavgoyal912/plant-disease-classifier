# PROJECT_CONTEXT.md: PatraVyadhi (Plant Disease Classifier)

> **For any AI assistant reading this:** this file is the source of truth for the project. Read it fully before answering. Follow the API contract and folder structure below. When you change something that affects this file, tell the user exactly what to update here. Give complete code for the file being changed, and keep files small with one job each.

## 1. What this is
PatraVyadhi (the app's name since Phase 6b; the project was previously called "Plant Disease Classifier") is a web app where a user uploads a plant-leaf image; a CNN predicts the disease class with a confidence score; every prediction is stored and can be browsed later. Gemini adds plain-language advice and an "is this a leaf?" check. Includes a clear disclaimer (not professional agronomic advice).

## 2. Stack
| Layer | Tool |
|---|---|
| Frontend | Next.js + Tailwind + Framer Motion (`motion/react`); screens designed in Stitch (including its static 3D decoration images), developed in Antigravity IDE |
| Backend | FastAPI (Python) |
| Model | MobileNetV2 transfer learning on PlantVillage, exported to ONNX, served with ONNX Runtime |
| AI assist | Google AI Studio / Gemini API (advice + leaf pre-check) |
| Database | Supabase (Postgres + Storage) |
| Auth | Supabase Auth (email OTP via Brevo SMTP + Google), done in Phase 7. Backend verifies the ES256 access token against the project's JWKS. |
| Observability | Highlight.io (Phase 8) |
| Deploy | Vercel (frontend), Render/Railway (API), Supabase (DB), added in Phase 8 |

## 2b. Architecture

```
Browser (Next.js + Tailwind, localhost:3000)
   |  every call carries Authorization: Bearer <Supabase access token>
   |  POST /predict (multipart image)
   v
FastAPI (localhost:8000)
   |-- 0. [Phase 7] verify token (app/auth.py, JWKS, ES256) -> user_id, else 401
   |-- 1. validate image (type, size)
   |-- 2. [Phase 5] Gemini leaf pre-check -> reject if not a leaf
   |-- 3. preprocess (see ml/export/preprocessing.json) and run ONNX model
   |-- 4. top-3 + confidence; is_uncertain if top confidence < threshold
   |-- 5. upload image to private Storage at <user_id>/<uuid>.<ext>, insert row in predictions with user_id
   |-- 6. [Phase 5] fetch/generate advice from disease_info (cached; Gemini only on cache miss)
   v
Response JSON -> result card.
```
History page reads via GET /predictions (this user's rows only, signed image_url). Detail page reads GET /predictions/{id}, plus GET /disease-info/{label} (cache lookup only, no Gemini) for confident scans. Stats page reads GET /stats (this user's counts only).

### Who does what
- Stitch: designs the 3 screens (Classify, History, Detail), exports React/Tailwind code. For Phase 6b it was used for a motion-forward, low-graphics, nature-themed direction and generated the small decoration images (leaf, droplet, seed). Its animation output is concept/static only; the real animation (Framer Motion) is built in Antigravity. Spline was considered and dropped (section 8).
- Antigravity IDE: moves screens into Next.js and wires them to the API. For Phase 6b, also implements real animations (Framer Motion / motion/react) on top of Stitch's motion-forward designs.
- Google AI Studio: prototype and test Gemini prompts (advice, leaf check) before they go in the backend.
- Supabase: Postgres for predictions and disease_info, private Storage for images, Auth (email OTP + Google) and RLS (Phase 7).
- ONNX Runtime: the only thing that classifies. Gemini never classifies.
- AI chat assistant: writes backend and ML code from this file.
- Highlight.io: errors and session replay, Phase 8 only.

**Note (Phase 4 deviation, see section 8):** the actual Phase 4 frontend was hand-built directly by the AI chat assistant instead of via Stitch → Antigravity, because the user preferred to reuse an already-built implementation rather than repeat a design pass. This section describes the intended pipeline; section 8 records why Phase 4 diverged from it, and Phase 6b (section 4) is when the real Stitch → Antigravity pipeline is picked back up for the visual/motion redesign.

**Note (Phase 6 deviations, see section 8):** all Phase 6 frontend files (photo tips, text cleanup, stats page, History filter) were written by the AI chat assistant, not Antigravity, because Antigravity's quota was exhausted until 2026-10-14. The backend `GET /stats` route is backend code, so it was the chat assistant's job anyway.

**Note (Phase 6b deviations, see section 8):** Phase 6b followed the Stitch → Antigravity pipeline. Two small deviations happened because Antigravity's usage quota ran out mid-task: the backend route `app/routes/disease_info.py` was supplied by the AI chat assistant (backend code is its job anyway), and `components/AdviceTabs.tsx` was rewritten twice in chat (tab-wrap fix, then the slider version). Section 3's rule still applies: ask before substituting hand-written screens for the pipeline.

**Note (Phase 7 deviations, see section 8):** the login screen, `AuthProvider`, `lib/supabase.ts` and the auth edits to `lib/api.ts`, `TopBar.tsx`, `layout.tsx`, `PredictionCard.tsx` and the Detail page were written by the AI chat assistant, not Stitch → Antigravity, because Antigravity's quota was exhausted until 2026-10-14. The user approved this.

## 3. Constraints and working rules
- No Claude Code. Backend is written with an AI chat assistant and refined in Antigravity.
- Highlight.io and deployment are LAST (Phase 8). Auth and RLS exist since Phase 7: every route except `/health` requires login.
- `user_id` is NOT NULL (FK to `auth.users`) since Phase 7.
- Everything runs locally first: frontend `localhost:3000`, backend `localhost:8000`.
- Secrets live only in `.env` files (never committed). Supabase service-role key and Gemini key are server-side only.
- Commit to Git after every working step.
- **How to run locally (Windows/PowerShell, project at `D:\Project`):** two terminals. Backend: `cd backend`, activate the venv (`.\venv\Scripts\Activate.ps1`), `pip install -r requirements.txt` (only after requirements change), then `uvicorn app.main:app --reload --port 8000`. Frontend: `cd frontend`, `npm run dev`. Check the backend at `http://localhost:8000/docs`, the app at `http://localhost:3000`. If `pip.exe` is blocked by an Application Control policy, use `python -m pip install -r requirements.txt` instead. `--reload` does NOT pick up `.env` changes — Ctrl+C and restart after editing `.env`. When replacing project files, verify with e.g. `Select-String -Path app\config.py -Pattern "GEMINI"` that the new version actually landed (a failed overwrite once left the old Phase 4 code running with no error). The frontend needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public key only) in `frontend/.env.local`; restart `npm run dev` after editing. The backend needs no new env vars. Tailwind must stay on v3 (`tailwindcss@3`); v4 breaks `postcss.config.mjs`.
- Whenever PROJECT_CONTEXT.md is updated (end of a phase, a bug fix, a decision change), review every section for what needs to change — not just section 4 (status). At minimum check: section 4 (roadmap/status), section 5 (folder structure, if new files were added), section 6 (API contract, if it changed), section 7 (schema, if it changed), section 8 (key decisions, if a new one was made or an assumption was corrected), section 9 (known issues, if one was found or resolved), and section 10 (fill in the phase-prompt template with that phase's actual outcome). Tell the user exactly which sections changed and give the full updated text for each.
- **Before generating or wiring any frontend screen, check section 2b's "who does what" and follow it — don't substitute hand-written screens for the Stitch → Antigravity pipeline without asking first.** (Added after Phase 4 deviated from this once.)
- **The backend uses the service-role key, which bypasses RLS. Every `predictions` query in `db.py` must filter by `user_id`.** RLS is a safety net, not the protection.

## 4. Roadmap and current status
- [x] Phase 0: Project setup
- [x] Phase 1: Train the model (PlantVillage, MobileNetV2, export ONNX + labels.json)
- [x] Phase 2: Supabase (tables, storage bucket, no auth)
- [x] Phase 3: FastAPI backend (/predict + history endpoints) — see section 9 for a concurrency bug found and fixed after initial sign-off
- [x] Phase 4: Frontend (Stitch screens, Antigravity wiring) — functional wiring complete, both open bugs resolved (see section 9). Visual design intentionally left as the hand-built stopgap (section 8); real redesign deferred to Phase 6b.
- [x] Phase 5: Gemini features (advice + leaf pre-check) — done 2026-10-02. Leaf pre-check prompt tested in Google AI Studio (leaf → true, non-leaf → false) and confirmed working in the app; advice shows in the result card and is cached in `disease_info`. Model: `gemini-3.1-flash-lite`.
- [-] Phase 5b (retrain on real-world data): considered and DROPPED 2026-10-02 by the user. The project stays on the PlantVillage-only model `mnv2-plantvillage-v1`; no retraining is planned.
- [x] Phase 6: Polish — done 2026-10-10. Leaf logo, low-confidence UX (photo tips, supported-crops line), minimal-text cleanup, stats page (`GET /stats`), evaluation write-up (`docs/EVALUATION.md`), type-ahead disease filter on History. Details in section 8.
- [x] Phase 6b: Motion frontend redesign — done 2026-10-07. The app is named PatraVyadhi. Classify, History and Detail rebuilt from Stitch designs with Framer Motion; Detail shows cached advice via `GET /disease-info/{label}`. Details in section 8.
- [x] Phase 7: Auth — done 2026-10-10. Supabase Auth (email code via Brevo SMTP, and Google), ES256 JWT check in FastAPI (`app/auth.py`), `user_id` NOT NULL + FK, RLS on `predictions`, `disease_info` and the `plant-images` bucket, private bucket with signed image URLs, per-user History and Stats, login screen and session handling in the frontend. Details in section 8.
- [ ] Phase 8: Ship (Highlight.io, Docker, deploy, README)   <- NEXT

**Currently working on:** nothing in progress. Phase 7 is signed off; the next phase is Phase 8 (Ship). The user will give the specific Phase 8 instructions in the next session.

**Last thing that worked:** Phase 7 sign-off (2026-10-10): the user confirmed sign-in with Google and with the emailed code, Classify, History and Detail images (signed URLs), per-user Stats and Sign out all work. Opening `GET /stats` without a token returns 401 "Missing access token."

**Current problem(s):** none blocking. Known accepted limitations: real-world phone photos are less reliable than lab-style ones (section 9, first bullet); Detail shows advice only for labels already in the `disease_info` cache; the History filter picks one disease, not a whole crop; the email sender is a personal Gmail address behind Brevo (set up a proper domain sender in Phase 8); Google sign-in is in "Testing" mode (publish in Phase 8); signed image URLs expire after 1 hour (section 9).

## 5. Folder structure
```
project/
- PROJECT_CONTEXT.md
- README.md
- .gitignore
- ml/          train.ipynb, evaluation/ (metrics.json, confusion_matrix.png, classification_report.txt, training_curves.png), export/ (model.onnx, labels.json, preprocessing.json)
- backend/     FastAPI app
               app/main.py, app/config.py, app/model.py, app/db.py, app/schemas.py
               app/auth.py          (Phase 7: verifies the Supabase ES256 access token via JWKS; FastAPI dependency `get_current_user` returns the user id)
               app/gemini.py        (Phase 5: leaf pre-check + advice generation, the only file that calls Gemini)
               app/routes/predict.py, app/routes/predictions.py
               app/routes/disease_info.py      (GET /disease-info/{label}, read-only cache lookup, no Gemini, login required)
               app/routes/stats.py             (GET /stats, read-only counts for the signed-in user; uses db.get_stats)
               app/__init__.py, app/routes/__init__.py
               requirements.txt (includes google-genai and PyJWT[crypto]), .env.example (real .env is gitignored; GEMINI_API_KEY, GEMINI_MODEL, optional GEMINI_TIMEOUT_SECONDS)
- frontend/    Next.js app
               package.json (includes @supabase/supabase-js; tailwindcss pinned to v3), next.config.mjs, tailwind.config.ts, postcss.config.mjs, tsconfig.json
               .env.local.example (NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY; real .env.local is gitignored), .gitignore
               app/layout.tsx, app/globals.css
               app/page.tsx                    (Classify screen)
               app/login/page.tsx              (Phase 7: email code + Google sign-in)
               app/history/page.tsx            (History screen)
               app/predictions/[id]/page.tsx   (Detail screen)
               app/stats/page.tsx              (Stats screen)
               app/icon.svg
               app/apple-icon.png
               lib/api.ts       (typed fetch client; every call goes through apiFetch(), which attaches the Bearer token and signs out on 401; PredictResponse vs PredictionRecord, see section 6)
               lib/supabase.ts  (Phase 7: browser Supabase client with the public key, plus getAccessToken())
               lib/format.ts    (label/percent formatting, null-safe)
               lib/labels.ts    (copy of ml/export/labels.json as `LABELS` plus `matchLabels()` for the History filter; regenerate if the model's classes change)
               components/      (ConfidenceBar, AdviceTabs, PredictionCard, TopBar, StatTile, LabelCombobox, Decor, AnalyzingLine, MotionProvider, AuthProvider — see frontend/components/)
               public/logo.svg
               public/decor/    (leaf.png, droplet.png, seed.png: transparent decoration images; seed.png is currently unused)
- docs/        ai-design.md (prompt and decision log), EVALUATION.md (model evaluation write-up)
```
Note: root folder is named `project/` (not `plant-disease-classifier/` as originally planned). `frontend/lib/storage.ts` was removed in Phase 7 (images now come as signed URLs from the backend). If it is still in your folder, delete it.

## 6. API contract (confirmed against real backend code, 2026-09-26; Phase 5 additions 2026-10-01; Phase 6b addition 2026-10-07; Phase 6 addition 2026-10-10; Phase 7 changes 2026-10-10)
`POST /predict`'s response and the list/detail/feedback responses are **two different shapes** — this wasn't spelled out clearly before and caused a real bug, so it's explicit now.

**Authentication (Phase 7).** Every route except `GET /health` requires the header `Authorization: Bearer <Supabase access token>`. A missing, malformed, expired or invalid token returns `401` with a plain string `detail` ("Missing access token.", "Access token expired." or "Invalid access token.") and a `WWW-Authenticate: Bearer` header. The frontend's `apiFetch()` (lib/api.ts) attaches the token and signs the user out on a 401. All data is scoped to the signed-in user (the token's `sub`): another user's prediction id returns `404`, never `403`. `user_id` is never included in any response.

- `POST /predict` : multipart form, field `file` (image). Returns `PredictResponse`:
  ```
  { id, label, confidence, top3: [{label, confidence}], is_uncertain, image_url, model_version, advice? }
  ```
  `image_url` is a signed URL (private bucket) that expires after 1 hour.

  `advice` (Phase 5) is either `null` or an object `{ summary, symptoms, treatment, prevention }` (all strings; same four text columns as `disease_info`). It is `null` when `is_uncertain` is true (the top label is probably wrong, so advice for it would mislead) or when Gemini / the cache lookup is unavailable. Advice is generated from the predicted label only, never from the image.

  **Error responses from `POST /predict`:**
  - `401` (Phase 7) missing/invalid/expired token. Checked first, before any Gemini call, upload or database write.
  - `400` unsupported file type, `413` file too large, `500` inference failed (or the image URL could not be created) — `detail` is a plain string.
  - `422` (Phase 5) Gemini says the image isn't a leaf: `{ "detail": { "code": "not_a_leaf", "message": "<user-facing text>" } }`. Nothing is run through ONNX, uploaded to Storage, or saved to `predictions`. This is the only error whose `detail` is an object rather than a string; the frontend's `ApiError` (lib/api.ts) handles both.
  - If the Gemini leaf check can't run (no key, timeout, quota, bad response), the request is NOT rejected — the check fails open and classification continues.

- `GET /predictions?page=&page_size=&label=` : returns `PaginatedPredictions` (only the signed-in user's rows):
  ```
  { items: PredictionRecord[], page, page_size, total }
  ```

- `GET /predictions/{id}` : returns one `PredictionRecord`.

- `PredictionRecord` shape (used by both endpoints above, and returned by feedback below):
  ```
  { id, image_path, image_url?, predicted_label, confidence, top3: [{label, confidence}],
    is_uncertain, model_version, feedback_correct?, corrected_label?, created_at }
  ```
  Note the different field names vs. `PredictResponse`: `predicted_label` (not `label`). `image_path` is the raw Storage path (`<user_id>/<uuid>.<ext>`) and is no longer used to build URLs. **Phase 7:** `image_url` is a signed URL built by the backend (expires after 1 hour; `null` only if signing failed for that image, in which case the UI shows "Image unavailable"). No `advice` field on this shape (the Detail screen gets it from `GET /disease-info/{label}`).

- `DELETE /predictions/{id}` : `204 No Content`, empty body. Deletes the row and its Storage object. `404` if the id isn't the user's.

- `POST /predictions/{id}/feedback` : body `{ correct: bool, corrected_label? }`. Returns the updated `PredictionRecord` (with `image_url`).

- `GET /disease-info/{label}` (Phase 6b): `label` is the exact `labels.json` string, URL-encoded by the client (`getDiseaseInfo()` uses `encodeURIComponent`). Returns `DiseaseInfoResponse`: `{ summary, symptoms, treatment, prevention }` (all strings), read from the `disease_info` cache. Read-only: never calls Gemini, never writes. **Global data (not per-user), but requires login (Phase 7).** Returns `404` with a plain string `detail` ("No advice cached for this label.") when there is no row or any field is empty; `getDiseaseInfo()` turns that 404 into `null`. The Detail screen calls it only when `is_uncertain` is false.

- `GET /stats` (Phase 6; **per-user since Phase 7**): no parameters. Returns `StatsResponse`: `{ total_scans, uncertain_scans, feedback_yes, feedback_no, top_diseases: [{label, count}] }` (all integers except `label`, a raw `labels.json` string), counting only the signed-in user's scans. Read-only: never calls Gemini, never writes. `top_diseases` is the 5 most frequent predicted labels among **confident** scans only (uncertain scans are excluded because their top label is probably wrong). The frontend computes the percentages (uncertain rate = `uncertain_scans / total_scans`; marked-correct rate = `feedback_yes / (feedback_yes + feedback_no)`, shown as "—" when no feedback exists).

- `GET /health` : no auth. Returns `{ status, model_loaded }`.

## 7. Database schema (Supabase Postgres — confirmed matching live `db.py`/`schemas.py`)
```sql
create table predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,   -- Phase 7
  image_path text not null,              -- '<user_id>/<uuid>.<ext>' in the private bucket
  predicted_label text not null,
  confidence real not null,
  top3 jsonb not null,
  is_uncertain boolean not null default false,
  model_version text not null,
  feedback_correct boolean,
  corrected_label text,
  created_at timestamptz not null default now()
);
-- indexes: created_at (desc), predicted_label (Phase 2); (user_id, created_at desc) (Phase 7)

create table disease_info (
  label text primary key,
  summary text, symptoms text, treatment text, prevention text,
  generated_by text default 'gemini',
  updated_at timestamptz default now()
);
```
**RLS (Phase 7), enabled on both tables:**
- `predictions`: select / insert / update / delete for role `authenticated` only where `user_id = auth.uid()`. No `anon` access.
- `disease_info`: select for `authenticated` (any logged-in user); no write policy, so only the backend (service-role key, which bypasses RLS) can write.

**Storage:** bucket `plant-images` is **private** (Phase 7). Policies on `storage.objects` let `authenticated` users select / insert / delete only objects whose first folder equals their own `auth.uid()`. The backend uploads and signs URLs with the service-role key.

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
- `plant-images` was public through Phase 6 because no auth existed; **made private in Phase 7** (see the Phase 7 private-bucket bullet).
- Added indexes on `predictions.created_at` (desc) and `predictions.predicted_label` to support the paginated/filtered `GET /predictions` contract in section 6.
- **Root project folder is named `project/`, not `plant-disease-classifier/`** — section 5 corrected to match.
- **All FastAPI route handlers in `routes/predict.py` and `routes/predictions.py` are plain `def`, not `async def`.** Every one of them calls synchronous Supabase-client or ONNX code; wrapping that in `async def` blocks FastAPI's single event loop for every other in-flight request. Plain `def` routes run in a threadpool automatically. This was a real bug (History would hang behind a slow Classify call) found and fixed after Phase 3 was initially marked done — see section 9.
- **`GET /predictions` and `GET /predictions/{id}` originally returned only `image_path` (a raw Storage path) and the frontend built the public URL itself via `lib/storage.ts`. Superseded in Phase 7:** both endpoints now also return a backend-signed `image_url`, and the frontend no longer builds URLs itself (`lib/storage.ts` removed).
- **Phase 4's frontend was hand-built directly**, not via Stitch → Antigravity as section 2b describes, because the user chose to reuse an already-built implementation rather than repeat the design step. The wiring/logic files (`lib/api.ts`, `lib/format.ts`, `lib/storage.ts`) carried over into the Phase 6b redesign unchanged apart from one addition: `getDiseaseInfo()` in `lib/api.ts` (section 6). (`lib/storage.ts` was later removed in Phase 7.)
- **IPv4-only DNS resolution workaround, added in `db.py` (2026-09-27):** the dev machine's network resolves the Supabase host to two IPv6 addresses in the `64:ff9b::/96` NAT64-synthesized range, which aren't actually routable here. The OS tried those first on every new connection, hanging ~21s each (~43s total) before falling back to the real IPv4 address — this, not the ONNX model, was the entire cause of the 15+ second `/predict` latency (confirmed via a standalone socket-level diagnostic: forced-IPv4 connects in ~0.06s vs ~42s default). Fixed by monkey-patching `socket.getaddrinfo` in `db.py` to filter out non-IPv4 results at import time. Environment-specific — worth re-checking once deployed to Render/Railway in Phase 8 (harmless to leave in either way).
- **Stitch's motion/animation capability is limited, confirmed via research (2026-09-27):** Stitch can generate motion-forward visual concepts and "kinetic UI," but does not produce production animation code — reviews are consistent that real interaction/animation implementation still needs a dedicated tool. Decision: Phase 6b will use Stitch for the visual redesign direction, then implement actual animations with Framer Motion (`motion/react`) in Antigravity, same division of labor as the existing Stitch → Antigravity pipeline.
- Logo: A simple original leaf mark, drawn as SVG in chat. It is a leaf-green (#5E8C61) rounded square holding a pale-green (#EAF3E1) leaf with a midrib line. app/icon.svg and public/logo.svg are the same drawing, so replace both together. It can be swapped later for a Stitch or Canva logo by replacing those two files and regenerating app/apple-icon.png.
- Tab title: Set in frontend/app/layout.tsx under metadata.title (currently: PatraVyadhi). The description line is in the same file.

- **Phase 5: Gemini lives in one module, `app/gemini.py`, and fails open (2026-10-01).** Both `check_is_leaf` and `generate_advice` catch every error (missing key, timeout, quota, blocked/invalid response), log a warning, and return `None`. A Gemini outage therefore never breaks classification: a `None` leaf check lets the image through, a `None` advice returns `advice: null`. Rationale: Gemini is a supporting tool (above), and the user chose "fail open" over "fail closed". Trade-off: during an outage, non-leaf images are no longer filtered. Uses the `google-genai` SDK with structured JSON output (`response_mime_type` + `response_schema`); client timeout is set in milliseconds from `GEMINI_TIMEOUT_SECONDS` (default 10).
- **Phase 5: non-leaf images get HTTP 422 with `detail = {code: "not_a_leaf", message}`** and are not run through ONNX, uploaded, or stored (user's call, section 6). The reason Gemini gives is logged server-side only, not shown to the user.
- **Phase 5: advice is cached per label in `disease_info`, Gemini is called only on a cache miss.** Lookup is by the exact `labels.json` string. A row counts as a hit only if all four text fields are non-empty. Advice runs *after* the prediction row is saved and never raises, so an advice failure can't lose a successful classification. If generated advice can't be written to the cache, it's still returned (just not cached).
- **Phase 5: no advice for uncertain predictions** (`is_uncertain` true → `advice: null`), because advice for a probably-wrong label would be misleading. Advice is generated from the label text only; the image is sent to Gemini only for the leaf check.
- **Phase 5: `disease_info` fills lazily on cache misses, not pre-seeded.** The user chose lazy fill, so no seed script exists. (A pre-seed script would be a new file outside section 5.)
- **Phase 5: prompts are drafts until tested in Google AI Studio.** Per section 2b, prompt prototyping/testing belongs to AI Studio. The two prompt constants at the top of `gemini.py` (`LEAF_CHECK_PROMPT`, `ADVICE_PROMPT_TEMPLATE`) are starting drafts; the final tested versions should replace them and be logged in `docs/ai-design.md`.
- **Phase 5: frontend change is minimal.** `app/page.tsx` renders `advice` (4 short sections plus a one-line "AI-generated, not professional agronomic advice" disclaimer, per section 1) inside the existing result card. `lib/api.ts` gained an `Advice` type and an `ApiError` class that understands the structured 422 detail. Existing page.tsx imported a non-existent `PredictionResult` type from `lib/api.ts`; corrected to `PredictResponse` (the name in section 6 and `lib/api.ts`). No layout/visual redesign (Phase 6b).

- **Phase 5 sign-off notes (2026-10-02):** the leaf-check prompt (`LEAF_CHECK_PROMPT` in `gemini.py`) was tested unchanged in AI Studio with Structured output set to `{is_leaf: boolean, reason: string}` (AI Studio's default single-`response` schema produced a useless `{"response": "{"}`; that was a settings issue, not a prompt problem). `GEMINI_MODEL=gemini-3.1-flash-lite` confirmed via AI Studio's "Get code". The Gemini API key lives in `backend/.env` only.
- **Decision (2026-10-02): no retraining. The project stays on the PlantVillage-only model (`mnv2-plantvillage-v1`).** Retraining on real-world/in-the-wild data was discussed and dropped by the user. Real-world weakness is handled through UX (Phase 6) and the Gemini leaf pre-check, not a new model. Gemini still never classifies (above).

- **Decision (2026-10-02): the frontend will be renovated with motion design (Phase 6b), and Phase 6b now comes BEFORE Phase 6 (Polish).** Done 2026-10-07 (details in the Phase 6b bullets below). Section 2b's roles and section 3's rule about not hand-writing screens still apply.

- **Phase 6b: app renamed PatraVyadhi (2026-10-07).** The name is the top-bar wordmark and the page title; the top-bar links are "Classify", "History" and (since Phase 6) "Stats", plus "Sign out" (Phase 7). Internal names (the `project/` folder, the API title, the Supabase project) were not changed.
- **Phase 6b: design direction (2026-10-07).** Nature-themed, poster-like, very little text, left-aligned, sentence case, low graphics. The palette is inspired by the howmanyplants.com design-system reference (not copied) and moved to light green. Tailwind theme tokens, referenced by name with no hardcoded hex in components: `background` #EAF3E1, `surface-raised` #F3F8EC, `card` (lilac) #E8D1EB, `text` #222222, `accent` (olive-yellow) #BFB33B, `leaf` (deeper green) #5E8C61. No white or cream anywhere. A typewriter-style display font (Tailwind class `font-typewriter`) plus a clean sans-serif, two weights only; the exact font families are set in `frontend/app/layout.tsx` / `tailwind.config.ts`. The 3 screens were designed in Stitch, exported as code plus screenshots, and rebuilt in Next.js by Antigravity.
- **Phase 6b: Spline considered and dropped (2026-10-07).** Spline is a 3D design tool, not a screen generator, and live WebGL scenes risk making the dev machine heavy. Decision: Stitch for design plus Framer Motion for motion; any 3D objects are static images only, never a live 3D scene.
- **Phase 6b: decoration images are static (2026-10-07).** The leaf, droplet and seed images were generated in Stitch; the user removed their backgrounds in Canva and saved them as transparent PNGs in `frontend/public/decor/` (same file names). The first version looked bad because the PNGs still had white boxes around them; the images were then enlarged and replaced with the transparent files. `leaf.png` and `droplet.png` are used (floating with a small tilt); `seed.png` is unused. Keep each image small in file size.
- **Phase 6b: motion rules (2026-10-07).** Animate only `transform` and `opacity` (fade, slide, scale, slow float, bar fill); no blur, shadow or filter animation; no canvas or WebGL; no continuous animation except the decoration floats and the "analyzing" pulse. Respect reduced motion (`MotionConfig reducedMotion="user"`). The goal is that the user's computer stays smooth.
- **Phase 6b: Detail now shows advice through a new read-only route (2026-10-07).** The old Detail page never showed advice (checked against the pre-redesign file); advice appeared only on the Classify result card, because `GET /predictions/{id}` has no `advice` field (section 6). The user asked for it on Detail, so `GET /disease-info/{label}` was added: it reads the `disease_info` cache only, never calls Gemini, never writes, and returns 404 when the row is missing or incomplete. Detail calls it only when `is_uncertain` is false and shows nothing (no error) on 404 or failure. Consequence: Detail shows advice only for labels already cached (lazy fill, see above), so it appears per disease after one confident scan of that disease.
- **Phase 6b: `AdviceTabs` is shared and slider-style (2026-10-07).** One component (`components/AdviceTabs.tsx`) serves both Classify and Detail. The tabs sit on one line, scroll sideways if the card is narrow, with a sliding underline, direction-aware slide of the text, and swipe left/right on touch screens. It replaced an earlier version whose tab row overflowed the narrow Detail card ("Prevention" ran past the edge).
- **Phase 6b: deviations from section 2b (2026-10-07).** Antigravity's usage quota ran out mid-task ("Individual quota reached", resets 2026-10-14). It had already done most of the `/disease-info` work (`DiseaseInfoResponse` in `schemas.py`, the router include in `main.py`, `getDiseaseInfo()` in `lib/api.ts`, the Detail page wiring) but never created `app/routes/disease_info.py`, so the backend would have failed on startup with an import error. That route file was supplied by the AI chat assistant, and `AdviceTabs.tsx` was rewritten in chat twice (tab-wrap fix, then the slider version). The user approved doing it this way.
- **Phase 6b: "We're not sure" results were not caused by the redesign (2026-10-07).** When many clean-looking photos showed "We're not sure", the backend's `is_uncertain` flag (confidence below 0.60, section 8) was the cause; the frontend only displays it. The model needs clear, close, well-lit photos of one leaf. This is the known PlantVillage limitation (section 9), to be handled with UX in Phase 6.

- **Phase 6: scope and what already existed (2026-10-10).** The roadmap listed low-confidence UX, feedback button, filters, stats and an evaluation write-up. The feedback control (Yes/No plus corrected label) already existed on Detail since Phase 4, so no new feedback work was done. Everything else was built, in the order: photo tips, text cleanup, stats, evaluation write-up, History filter.
- **Phase 6: low-confidence UX (2026-10-10).** The upload area now says "Best results: one leaf, close up, good light, plain background." and ends with "Works on [14 crops]". The "We're not sure" card keeps the lilac card, the closest-possibilities bars and no advice, and gains a short "Tips for a better photo" box (fill the frame with one leaf; daylight, no shadows or glare; hold the camera steady) plus the same crops line. The crops list is `apple, blueberry, cherry, corn, grape, orange, peach, pepper, potato, raspberry, soybean, squash, strawberry and tomato`, derived from the 38 classes in `labels.json`, so update it if the model's classes ever change.
- **Phase 6: minimal-text policy (2026-10-10).** Technical or decorative copy was removed from Classify, Detail, History and the History card (for example "Botanical pathology engine", "Archived dossier", "Specimen capture / PV-REC", "Neural confidence", "Herbarium archive", "Review dossier"), all-caps labels became sentence case, and the large poster-style headlines were kept. The History card's "Verified" badge was removed because a confident scan is not verified by anyone; only the "Uncertain" tag remains. Detail's feedback buttons now read "Yes" / "No" under "Was this correct?" and the delete control reads "Delete scan" (still confirms first).
- **Phase 6: stats (2026-10-10).** New read-only `GET /stats` (section 6) and a `/stats` page with three tiles (Scans, Not sure, Marked correct) and a "Most scanned" list; "Stats" was added to the top bar. Counts come from four count queries plus a tally of confident scans per label. PostgREST has no GROUP BY, so the tally pages through `predictions` 1000 rows at a time in `db.get_stats()`; fine at personal scale, revisit with a Postgres view/RPC if the table gets large. The plain-`def` rule (section 8) applies to this route too.
- **Phase 6: evaluation write-up (2026-10-10).** `docs/EVALUATION.md` reports the real numbers from `ml/evaluation/` (`classification_report.txt`, `metrics.json`, the two plots): test accuracy 99.48% (42 wrong of 8,146), top-3 accuracy 99.96%, macro F1 0.9918, best validation accuracy 99.44% at epoch 8, split 38,013 / 8,146 / 8,146 from 54,305 images. It includes the 0.60-threshold table: at 0.60, 98.04% of test images get an answer, those are right 99.87% of the time, and 32 of the 42 errors are shown as "not sure". These are lab-style numbers only and the document says so; real phone photos scored 10-25% confidence in informal tests (section 9).
- **Phase 6: History filter is a type-ahead dropdown (2026-10-10).** The old text box sent whatever was typed to `GET /predictions?label=`, which only matches a full raw label exactly, so "pepper" found nothing. It is now `components/LabelCombobox.tsx`: typing narrows a list of readable disease names (every typed word must start a word in the name; names starting with the typed text come first, so "p" lists Peach, Pepper, Potato first), arrow keys and Enter work, and choosing a name sends the exact raw label. Typed text alone never filters. The 38 labels live in `frontend/lib/labels.ts`, a copy of `ml/export/labels.json` (the frontend cannot import from `ml/`). The backend is unchanged.
- **Phase 6: deviations from section 2b (2026-10-10).** Antigravity's quota was exhausted until 2026-10-14, so all Phase 6 frontend files were written by the AI chat assistant and pasted in by the user. The Phase 6b `AdviceTabs.tsx` rewrites (wrap fix, then slider version) were done the same way. The user approved.

- **Phase 7: auth design (2026-10-10).** Supabase Auth with email code (OTP) and Google. The frontend signs in with `@supabase/supabase-js` (public key, PKCE, session in the browser) and sends the access token to FastAPI. FastAPI verifies it in `app/auth.py`: the project's signing key is ECC P-256 (ES256), so the check fetches public keys from `<SUPABASE_URL>/auth/v1/.well-known/jwks.json` (`PyJWT[crypto]`, `PyJWKClient`, keys cached), and verifies signature, expiry, audience `authenticated` and issuer. No JWT secret is stored anywhere. `get_current_user` is a plain `def` dependency (the plain-`def` rule applies).
- **Phase 7: the backend, not RLS, is the real protection.** The backend uses the service-role key, which bypasses RLS, so every `predictions` query in `db.py` takes a `user_id` and filters on it, and `insert_prediction` sets it. RLS and the storage policies are a safety net for any direct access with the public key.
- **Phase 7: per-user stats, global `disease_info` (user's decisions).** `GET /stats` counts only the signed-in user's scans. `GET /disease-info/{label}` stays global because it is a shared advice cache with no user data, but it requires login. Consequence: any user's confident scan fills the cache for everyone.
- **Phase 7: private bucket with signed URLs (user's decision; replaces the earlier "bucket is public" decision).** The `plant-images` bucket is private. New images are stored at `<user_id>/<uuid>.<ext>`. The backend returns `image_url` as a 1-hour signed URL on `POST /predict` and on every `PredictionRecord`. `lib/storage.ts` was deleted. `NEXT_PUBLIC_SUPABASE_URL` is still used, but now only by `lib/supabase.ts`.
- **Phase 7: cross-user access returns 404, not 403**, so prediction ids can't be probed. A malformed (non-UUID) id also returns 404.
- **Phase 7: existing rows and images were deleted by the user** before `user_id` was made NOT NULL, so there was no migration.
- **Phase 7: frontend session handling.** `components/AuthProvider.tsx` wraps the app inside `MotionProvider`; signed out → redirected to `/login`, signed in on `/login` → `/`, and a blank screen shows while the session loads so protected pages never call the API without a token. `TopBar` hides on `/login` and has a Sign out button. `apiFetch()` signs out on any 401.
- **Phase 7: email sender.** Supabase's built-in sender can't edit templates, so custom SMTP is required. Gmail SMTP was tried first and failed with `535 Username and Password not accepted`. The real cause was that the old settings were still active when Brevo was tested. **Brevo SMTP** is the working sender (host `smtp-relay.brevo.com`, port 587, login and SMTP key from Brevo's SMTP page; the sender address must be verified in Brevo). The "Confirm sign up" and "Magic link or OTP" templates both show `{{ .Token }}` so users get a code, not a link. The login code box accepts 6 to 10 digits.
- **Phase 7: Supabase dashboard settings.** URL Configuration: Site URL `http://localhost:3000`, redirect URL `http://localhost:3000/**`. Google provider enabled with an OAuth client whose redirect URI is the Supabase callback URL and whose JavaScript origin is `http://localhost:3000`. The Google app is in "Testing" mode (only listed test users can sign in).
- **Phase 7: deviations from section 2b (2026-10-10).** All Phase 7 frontend files were written by the AI chat assistant, not Stitch → Antigravity, because Antigravity's quota is exhausted until 2026-10-14. The user approved. The login screen reuses the existing theme tokens and has not been through a Stitch design pass.
- **Phase 7: Tailwind v4 incident.** After `npm install` the frontend failed with "It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin" because Tailwind v4 had been installed while the config is v3. Fixed with `npm install -D tailwindcss@3 postcss autoprefixer` and deleting `.next`. Keep `tailwindcss` on `^3.4`.

## 9. Known issues and next steps
- PlantVillage images are lab-style; the 99.48% test accuracy is on held-out images from the same distribution, not real phone photos. **Now confirmed as a real pattern, not a one-off**: multiple real-world test photos (natural lighting, cluttered/dark backgrounds, visible insect damage) all landed at 10–25% confidence with scattered, unrelated top-3 labels. `is_uncertain` correctly flags all of them rather than hiding them, but expect a meaningfully lower real-world accuracy than the reported test number, and plan real-world-style UX (Phase 6) accordingly. Seen again in Phase 5 testing (2026-10-02): a beech leaf → "Tomato — Early blight" 78%, a car photo → "Tomato — Early blight" 49.6% (flagged uncertain). The model has no "none of these" class and always picks one of its 38, so out-of-species leaves look confident. Accepted limitation (no retrain, see section 8): the Gemini leaf check only filters non-leaves, not unsupported species, so Phase 6 UX should set expectations (supported plants, photo tips, uncertainty message).
- Grouped split (by source-image id) reduces but doesn't fully eliminate near-duplicate leakage, so true generalization is somewhat below the reported test number.
- Weakest classes (still >93% F1), worth extra attention in real-world testing: Potato___healthy, Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot, Tomato___Early_blight, Tomato___Late_blight, Corn_(maize)___Northern_Leaf_Blight.
- disease_info.label must match labels.json strings exactly, character-for-character. In Phase 5 rows are written only from the label string the model actually predicted (never retyped), so a mismatch can't be introduced by hand; if a seed script is ever added, generate it from labels.json programmatically.
- **Resolved:** `routes/predict.py` and `routes/predictions.py` had `async def` handlers wrapping synchronous Supabase/ONNX calls, blocking the whole server per-request. Fixed by converting all five handlers to plain `def`.
- **Resolved:** `POST /predict` took 15+ seconds even after the async→def fix. Root cause: broken NAT64 IPv6 address resolution to the Supabase host on this network, adding ~43s per connection (see section 8). Fixed via an IPv4-only DNS patch in `db.py`. Confirmed by the user: total request time now ~5.5s.
- **Resolved:** History/detail thumbnails were suspected broken but turned out to be loading correctly on both the History and Detail pages once actually checked — no code change was needed.
- **Resolved (Phase 5):** `GEMINI_MODEL=gemini-3.1-flash-lite` set in `.env` and confirmed in AI Studio. The first-draft default `gemini-2.5-flash` was dropped because Gemini 2.5 models shut down 2026-10-16. The API key is created in AI Studio (aistudio.google.com/apikey).
- **Resolved (Phase 5):** leaf-check prompt tested in AI Studio and kept as written. The advice prompt is in use as drafted; if advice wording needs tuning, test the change in AI Studio first (section 2b), then paste it into `gemini.py` and log final prompts in `docs/ai-design.md`.
- **Watch (Phase 5):** every `/predict` now waits on a Gemini leaf check before inference (~5.5s baseline before this). If latency hurts, options are downscaling the image before sending it to Gemini or running the leaf check concurrently with something else — not done yet, measure first via the `[TIMING]` lines.
- **Watch (Phase 5):** the leaf check can reject borderline real photos (or let non-leaves through during a Gemini outage, since it fails open). Check behavior on the same real-world photos used in the first bullet's testing.
- **Resolved:** `app/page.tsx` imported `PredictionResult` from `lib/api.ts`, which only exports `PredictResponse` — a type-name mismatch left over from Phase 4. Fixed in Phase 5.
- **Known (Phase 6b): Detail advice depends on the cache.** `GET /disease-info/{label}` only returns advice that is already in `disease_info`, which fills lazily on a confident `/predict` (section 8). At sign-off (2026-10-07) the table held one row, `Pepper,_bell___Bacterial_spot`. Scans saved before Phase 5, or while Gemini was unavailable, show no advice on Detail until a new confident photo of the same disease is classified. Options if this bothers the user later: a one-time script that generates all 38 labels programmatically from `labels.json`, or letting the route call Gemini on a miss (adds a Gemini call when Detail opens). Not done; the user chose lazy fill.
- **Resolved (Phase 6):** the extra text on the Detail screen ("Archived dossier", "PV-REC" and similar) was removed in the minimal-text cleanup (section 8). The Tailwind `capitalize` class that made titles read "Early Blight" was also removed from the Detail headline, the Classify result headline and the History card title (confirmed by the user, 2026-10-10), so disease names now show in the sentence case that `formatLabel` produces.
- **Seen again (2026-10-07):** many clean-looking photos still gave "We're not sure" (the model needs clear, close, well-lit photos). Phase 6 added photo tips and the supported-crops line to set expectations; the underlying lab-vs-real-photo gap remains (section 9, first bullet).
- **Housekeeping (Phase 6b):** `design-ref/` (a temporary copy of the Stitch export, screenshots and images in the project root) should be in `.gitignore` and deleted once no longer needed. The originals are also kept outside the repo in `D:\Project-design\`. It is not part of the section 5 structure.
- **Known (Phase 6): the History filter picks one disease, not a whole crop.** Choosing "Pepper, bell — Bacterial spot" filters correctly, but there is no "all pepper" option because the backend matches one exact label. A crop-level filter would need a small backend change (for example accepting several labels or a prefix).
- **Known (Phase 6): `frontend/lib/labels.ts` is a copy of `ml/export/labels.json`.** It must match the model's labels character for character (the strings go to the backend), and it cannot be imported from `ml/`. If the model is retrained with different classes, regenerate it, and update the supported-crops line on Classify.
- **Known (Phase 6): stats scale.** `db.get_stats()` tallies top diseases by paging through `predictions` 1000 rows at a time. Fine now; replace with a SQL view or RPC if the table grows large.
- **Resolved (Phase 6):** after replacing `backend/app/main.py`, uvicorn once failed with `Attribute "app" not found in module "app.main"` because the file had been saved empty/with wrong contents; re-pasting the correct file fixed it. Verify replaced files as in section 3 (`Select-String`).
- **Note (Phase 6b):** Antigravity's usage quota can run out mid-task ("Individual quota reached"; this account's quota refreshes 2026-10-14). If it stops partway, check which files were already changed (Source Control / `git status`) before re-running a prompt.
- **Known (Phase 7): signed image URLs expire after 1 hour.** A History or Detail page left open longer shows "Image unavailable" or broken images until reloaded. Fine for now; if it bothers anyone, refetch on focus or lengthen the expiry (`SIGNED_URL_TTL_SECONDS` in `db.py`).
- **Known (Phase 7): Google sign-in is in "Testing" mode.** Only the listed test users can sign in. Publish the OAuth app in Phase 8, and add the production site URL to the Supabase URL Configuration and the Google OAuth client (origins and redirect URIs).
- **Known (Phase 7): email sender is a personal Gmail address verified in Brevo.** Fine for development, but deliverability may be poor. Set up a domain sender (for example Resend or Brevo with a verified domain) in Phase 8. Supabase also applies a 60-second minimum interval between emails per user.
- **Known (Phase 7): `disease_info` is global**, so any user's confident scan fills the shared cache. No action needed.
- **Known (Phase 7): the Supabase session is stored in the browser's localStorage** (supabase-js default). Acceptable for this app; revisit with cookie-based sessions only if server-side rendering of protected pages is ever needed.
- **Watch (Phase 7): `GET /stats` still tallies by paging 1000 rows**, now per user, so it is cheaper than before. Same advice as before if the table grows.
- **Next:** Phase 8 Ship (Highlight.io, Docker, deploy, README). It will need: production URLs in Supabase URL Configuration and the Google OAuth client, publishing the Google app, a proper email sender, CORS `FRONTEND_ORIGIN` set to the deployed frontend, the backend env vars on Render/Railway, the frontend env vars on Vercel (never the service-role key), and a re-check of the IPv4 DNS patch in `db.py` on the host.
- Browsers cache tab icons hard. If an icon change doesn't show, hard-refresh (Ctrl+Shift+R) or open the site in a private window.

## 10. Next session starter prompt
Copy everything below (with the current PROJECT_CONTEXT.md pasted in) to start the next session.

```
I'm building PatraVyadhi, a plant-leaf disease classifier web app (formerly "Plant Disease
Classifier"). Below is my PROJECT_CONTEXT.md, which is the source of truth for the project.
Read it fully before answering, including the architecture section and the working rules.

[PASTE THE FULL CONTENTS OF PROJECT_CONTEXT.md HERE]

CURRENT PHASE: Phase 8 (Ship)
WHAT I'M DOING RIGHT NOW: Phases 0-7 are complete (Gemini leaf pre-check + cached advice;
motion frontend redesign; Phase 6 polish; Phase 7 auth: Supabase email code via Brevo +
Google, ES256 JWT check in FastAPI, RLS, private bucket with signed URLs, per-user History
and Stats). The model stays PlantVillage-only (section 8). I'm starting Phase 8 (Ship);
I'll give the specific instructions in this session.
BACKEND PLATFORM: local venv (backend on localhost:8000, frontend on localhost:3000)
PROBLEM OR TASK: <fill in: what you want done for Phase 8>

RULES
- Follow section 2b's "who does what" - if a task belongs to Stitch, Antigravity,
  Google AI Studio, or another named tool/person, say so and don't silently do it
  yourself instead. Ask me first if you're unsure whose job something is.
- Only work on the current phase (Phase 8).
- Follow the folder structure, file names and paths in PROJECT_CONTEXT.md exactly
  - root folder is `project/`, not `plant-disease-classifier/`.
- Before assuming any API response shape, check section 6 - it is confirmed
  against the real backend code, not guessed. If you still need to guess something
  not covered there, tell me explicitly and ask, rather than assuming silently.
- If you need the current code of a file you haven't seen, ask me to paste it; don't
  rewrite files from memory.
- If something conflicts with PROJECT_CONTEXT.md, stop and ask me first.
- Give complete code for the file being changed, and explain what each part does.
- At the end, tell me exactly which sections of PROJECT_CONTEXT.md changed and
  give the full updated text for each - not just instructions to edit it myself.
```