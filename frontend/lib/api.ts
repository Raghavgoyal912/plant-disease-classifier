// Thin client for the FastAPI backend. Types below are copied field-for-field
// from backend/app/schemas.py (2026-09-26) — NOT the same shape as each other:
// PredictResponse (from POST /predict) and PredictionRecord (from the list/
// detail/feedback endpoints) use different field names. Do not merge them.

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface Top3Item {
  label: string;
  confidence: number;
}

// Phase 5: plain-language advice for the predicted class (mirrors the Advice
// model in backend/app/schemas.py and the disease_info table).
export interface Advice {
  summary: string;
  symptoms: string;
  treatment: string;
  prevention: string;
}

// Returned by POST /predict only. Already includes a full image_url.
export interface PredictResponse {
  id: string;
  label: string;
  confidence: number;
  top3: Top3Item[];
  is_uncertain: boolean;
  image_url: string;
  model_version: string;
  advice?: Advice | null; // null when uncertain or Gemini unavailable
}

// Returned by GET /predictions, GET /predictions/{id}, and
// POST /predictions/{id}/feedback. image_path is a raw Storage path, not a
// URL — pass it through buildImageUrl() from "@/lib/storage" to render it.
// No advice field here (schemas.py only puts it on PredictResponse).
export interface PredictionRecord {
  id: string;
  image_path: string;
  predicted_label: string;
  confidence: number;
  top3: Top3Item[];
  is_uncertain: boolean;
  model_version: string;
  feedback_correct?: boolean | null;
  corrected_label?: string | null;
  created_at: string;
}

export interface PaginatedPredictions {
  items: PredictionRecord[];
  page: number;
  page_size: number;
  total: number;
}

// Thrown for any non-2xx response. `code` is set when the backend sent a
// structured detail ({ code, message }), e.g. "not_a_leaf" from POST /predict.
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `API error ${res.status}: ${res.statusText}`;
    let code: string | undefined;
    try {
      const body = await res.json();
      const d = body.detail;
      if (d && typeof d === "object" && typeof d.message === "string") {
        // Structured detail (Phase 5): the message is already user-facing.
        message = d.message;
        code = typeof d.code === "string" ? d.code : undefined;
      } else {
        message = `API error ${res.status}: ${typeof d === "string" ? d : JSON.stringify(d ?? body)
          }`;
      }
    } catch {
      // response body wasn't JSON; keep the statusText message
    }
    throw new ApiError(message, res.status, code);
  }
  // DELETE returns 204 with no body
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export async function predict(file: File): Promise<PredictResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<PredictResponse>(res);
}

export async function listPredictions(params: {
  page?: number;
  page_size?: number;
  label?: string;
}): Promise<PaginatedPredictions> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.page_size) search.set("page_size", String(params.page_size));
  // URLSearchParams encodes the value itself, so labels with commas,
  // parentheses or spaces (section 8) are handled without double-encoding.
  if (params.label) search.set("label", params.label);

  const res = await fetch(`${API_BASE_URL}/predictions?${search.toString()}`);
  return handleResponse<PaginatedPredictions>(res);
}

export async function getPrediction(id: string): Promise<PredictionRecord> {
  const res = await fetch(`${API_BASE_URL}/predictions/${id}`);
  return handleResponse<PredictionRecord>(res);
}

export async function deletePrediction(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/predictions/${id}`, {
    method: "DELETE",
  });
  return handleResponse<void>(res);
}

export async function sendFeedback(
  id: string,
  body: { correct: boolean; corrected_label?: string }
): Promise<PredictionRecord> {
  const res = await fetch(`${API_BASE_URL}/predictions/${id}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<PredictionRecord>(res);
}

export async function getDiseaseInfo(label: string): Promise<Advice | null> {
  const res = await fetch(
    `${API_BASE_URL}/disease-info/${encodeURIComponent(label)}`
  );
  if (res.status === 404) {
    return null;
  }
  return handleResponse<Advice>(res);
}