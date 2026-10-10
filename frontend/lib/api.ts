// Thin client for the FastAPI backend. Types below are copied field-for-field
// from backend/app/schemas.py — NOT the same shape as each other:
// PredictResponse (from POST /predict) and PredictionRecord (from the list/
// detail/feedback endpoints) use different field names. Do not merge them.
//
// Phase 7: every call goes through apiFetch(), which attaches the Supabase
// access token. A 401 means the session is gone, so we sign out and the
// AuthProvider sends the user to /login.

import { getAccessToken, supabase } from "@/lib/supabase";

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

// Returned by POST /predict only. image_url is a signed URL (expires in 1 hour).
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
// POST /predictions/{id}/feedback. Phase 7: the bucket is private, so the
// backend adds a signed image_url (expires in 1 hour; null only if signing
// failed). image_path is kept but is no longer used to build URLs.
// No advice field here (advice comes from GET /disease-info/{label}).
export interface PredictionRecord {
  id: string;
  image_path: string;
  image_url?: string | null;
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

// Returned by GET /stats (Phase 6, per-user since Phase 7). Plain counts;
// percentages are computed in the page.
export interface DiseaseCount {
  label: string;
  count: number;
}

export interface StatsResponse {
  total_scans: number;
  uncertain_scans: number;
  feedback_yes: number;
  feedback_no: number;
  top_diseases: DiseaseCount[];
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

// fetch() plus the Authorization header. Do not set Content-Type here for
// FormData; the browser adds the multipart boundary itself.
async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (res.status === 401) {
    // Session missing or expired: AuthProvider redirects to /login.
    await supabase.auth.signOut();
  }
  return res;
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
  const res = await apiFetch("/predict", { method: "POST", body: formData });
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

  const res = await apiFetch(`/predictions?${search.toString()}`);
  return handleResponse<PaginatedPredictions>(res);
}

export async function getPrediction(id: string): Promise<PredictionRecord> {
  const res = await apiFetch(`/predictions/${id}`);
  return handleResponse<PredictionRecord>(res);
}

export async function deletePrediction(id: string): Promise<void> {
  const res = await apiFetch(`/predictions/${id}`, { method: "DELETE" });
  return handleResponse<void>(res);
}

export async function sendFeedback(
  id: string,
  body: { correct: boolean; corrected_label?: string }
): Promise<PredictionRecord> {
  const res = await apiFetch(`/predictions/${id}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<PredictionRecord>(res);
}

export async function getDiseaseInfo(label: string): Promise<Advice | null> {
  const res = await apiFetch(`/disease-info/${encodeURIComponent(label)}`);
  if (res.status === 404) {
    return null;
  }
  return handleResponse<Advice>(res);
}

export async function getStats(): Promise<StatsResponse> {
  const res = await apiFetch("/stats");
  return handleResponse<StatsResponse>(res);
}