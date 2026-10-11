# PatraVyadhi

Upload a photo of a plant leaf and get the likely disease, a confidence score and plain-language advice. Every scan is saved to your private history.

**Live app:** https://patravyadhi.vercel.app
**API docs:** https://plant-disease-classifier-bimg.onrender.com/docs

> PatraVyadhi is a learning project. Its advice is AI-generated and is not professional agronomic advice.

## How it works

1. You sign in (email code or Google) and upload a leaf photo.
2. Gemini checks that the image is a leaf. Non-leaves are rejected.
3. A MobileNetV2 model (ONNX Runtime) classifies the leaf into one of 38 PlantVillage classes and returns the top 3 with confidence. Below 60% confidence, the app says it is not sure.
4. The image goes to private Supabase Storage and the result to Postgres.
5. Gemini writes short advice (summary, symptoms, treatment, prevention) once per disease and it is cached.

Gemini never classifies. Only the ONNX model does.

## Stack

| Layer | Tool |
|---|---|
| Frontend | Next.js, Tailwind CSS v3, Framer Motion |
| Backend | FastAPI (Python) |
| Model | MobileNetV2 transfer learning on PlantVillage, served with ONNX Runtime |
| AI | Gemini API (leaf check and advice) |
| Database, storage, auth | Supabase (Postgres, private Storage, Auth with RLS) |
| Deploy | Vercel (frontend), Render free tier with Docker (backend) |

## Model results

Test accuracy 99.48% and macro F1 0.9918 on 8,146 held-out PlantVillage images. These are lab-style photos. Real phone photos are noticeably less reliable, which is why the app shows photo tips and an "not sure" state. Details are in `docs/EVALUATION.md`.

Supported crops: apple, blueberry, cherry, corn, grape, orange, peach, pepper, potato, raspberry, soybean, squash, strawberry and tomato.

## Run locally

Requirements: Python 3.11, Node.js, a Supabase project, a Gemini API key.

Backend:

```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1   |   macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # fill in the values
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
cp .env.local.example .env.local   # fill in the values
npm install
npm run dev
```

Open http://localhost:3000. API docs are at http://localhost:8000/docs.

Environment variables:

- Backend (`backend/.env`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `FRONTEND_ORIGIN`
- Frontend (`frontend/.env.local`): `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The service-role key and Gemini key are server-side only. Never put them in the frontend.

## Deployment

- Frontend: Vercel, Root Directory `frontend`.
- Backend: Render web service built from `backend/Dockerfile` with the repo root as the build context, so the model in `ml/export` is included.
- On the free tier the backend sleeps after about 15 minutes idle, so the first request can take 30 to 60 seconds.

## Project layout

```
ml/        training notebook, evaluation, exported model
backend/   FastAPI app, Dockerfile
frontend/  Next.js app
docs/      evaluation write-up, AI design log
```

## Limitations

- Trained on PlantVillage only, so real-world photos score lower than the test numbers.
- The model has no "none of these" class and always picks one of 38 labels. Only non-leaves are filtered, not unsupported plant species.
- Google sign-in is in Testing mode, so only listed test users can use it. Email code sign-in works for everyone.