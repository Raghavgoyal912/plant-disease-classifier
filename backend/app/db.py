"""
Supabase access layer: image upload to the `plant-images` bucket, plus
CRUD on the `predictions` table (schema in PROJECT_CONTEXT.md section 7).

Uses the service-role key server-side only. RLS is off until Phase 7, so
there is no user_id scoping here yet - every row is currently global.

NETWORKING WORKAROUND (see PROJECT_CONTEXT.md section 8/9):
This machine's network resolves the Supabase host to two IPv6 addresses in
the 64:ff9b::/96 NAT64-synthesized range, which are not actually routable
here. The OS tries those first on every new connection and hangs ~21s on
each before falling back to the real IPv4 address - adding ~43s to every
Supabase call (confirmed via a standalone socket-level diagnostic: IPv4-only
connects in ~0.06s, default resolution takes ~42s). Patching
`socket.getaddrinfo` to only return IPv4 results skips the broken addresses
entirely. This is applied once, at import time, before the Supabase client
opens any connections.
"""
import socket
import uuid
from typing import Optional

from supabase import create_client, Client

from app.config import settings

# --- IPv4-only DNS workaround (see module docstring) ---
_original_getaddrinfo = socket.getaddrinfo


def _ipv4_only_getaddrinfo(*args, **kwargs):
    results = _original_getaddrinfo(*args, **kwargs)
    ipv4_only = [r for r in results if r[0] == socket.AF_INET]
    return ipv4_only or results  # fall back to unfiltered results if somehow none are IPv4


socket.getaddrinfo = _ipv4_only_getaddrinfo
# --- end workaround ---

_client: Optional[Client] = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _client


def upload_image(file_bytes: bytes, content_type: str) -> str:
    """Upload one prediction image to the public `plant-images` bucket and
    return its storage path, stored as predictions.image_path."""
    client = get_client()
    ext = "jpg" if content_type == "image/jpeg" else content_type.split("/")[-1]
    path = f"{uuid.uuid4()}.{ext}"

    client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(
        path, file_bytes, {"content-type": content_type}
    )
    return path


def get_public_url(image_path: str) -> str:
    client = get_client()
    return client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).get_public_url(image_path)


def insert_prediction(record: dict) -> dict:
    client = get_client()
    result = client.table("predictions").insert(record).execute()
    return result.data[0]


def list_predictions(page: int, page_size: int, label: Optional[str]) -> tuple[list[dict], int]:
    """Paginated, optionally filtered by predicted_label, newest first -
    backed by the created_at/predicted_label indexes added in Phase 2."""
    client = get_client()
    query = client.table("predictions").select("*", count="exact")
    if label:
        query = query.eq("predicted_label", label)

    start = (page - 1) * page_size
    end = start + page_size - 1
    result = query.order("created_at", desc=True).range(start, end).execute()
    return result.data, result.count or 0


def get_prediction(prediction_id: str) -> Optional[dict]:
    client = get_client()
    result = client.table("predictions").select("*").eq("id", prediction_id).execute()
    return result.data[0] if result.data else None


def delete_prediction(prediction_id: str) -> bool:
    """Delete both the DB row and its storage object. Returns False if the
    row didn't exist so the route can return a 404 instead of a false 204."""
    client = get_client()
    row = get_prediction(prediction_id)
    if row is None:
        return False

    client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).remove([row["image_path"]])
    client.table("predictions").delete().eq("id", prediction_id).execute()
    return True


def update_feedback(prediction_id: str, correct: bool, corrected_label: Optional[str]) -> Optional[dict]:
    client = get_client()
    result = (
        client.table("predictions")
        .update({"feedback_correct": correct, "corrected_label": corrected_label})
        .eq("id", prediction_id)
        .execute()
    )
    return result.data[0] if result.data else None