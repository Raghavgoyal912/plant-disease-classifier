"""
Supabase access layer: image upload to the private `plant-images` bucket, CRUD
on the `predictions` table, and get/upsert on the `disease_info` advice cache
(schema in PROJECT_CONTEXT.md section 7).

Uses the service-role key server-side only. The service-role key BYPASSES RLS,
so since Phase 7 every predictions query here is scoped by `user_id` (the id
from the verified token, see app/auth.py). Never add a predictions query
without a user_id filter. disease_info stays global.

Images live at `<user_id>/<uuid>.<ext>` in a private bucket and are returned
to the frontend as short-lived signed URLs.

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
from datetime import datetime, timezone
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

SIGNED_URL_TTL_SECONDS = 3600  # signed image URLs expire after 1 hour

_client: Optional[Client] = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _client


def _bucket():
    return get_client().storage.from_(settings.SUPABASE_STORAGE_BUCKET)


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except (ValueError, AttributeError, TypeError):
        return False


# --- storage: private bucket + signed URLs ---

def upload_image(user_id: str, file_bytes: bytes, content_type: str) -> str:
    """Upload one prediction image to `<user_id>/<uuid>.<ext>` in the private
    `plant-images` bucket and return that path (stored as predictions.image_path).
    The user-id folder is what the storage policies from Phase 7 match on."""
    ext = "jpg" if content_type == "image/jpeg" else content_type.split("/")[-1]
    path = f"{user_id}/{uuid.uuid4()}.{ext}"
    _bucket().upload(path, file_bytes, {"content-type": content_type})
    return path


def _extract_signed(item) -> Optional[str]:
    """Pull the URL out of a storage response item. Different supabase-py
    versions name the key `signedURL` or `signedUrl`, and may return a path
    relative to /storage/v1 instead of a full URL."""
    if not isinstance(item, dict):
        return None
    url = item.get("signedURL") or item.get("signedUrl") or item.get("signed_url")
    if not url:
        return None
    if url.startswith("http"):
        return url
    base = settings.SUPABASE_URL.rstrip("/") + "/storage/v1"
    return base + (url if url.startswith("/") else "/" + url)


def create_signed_url(image_path: str) -> Optional[str]:
    """Signed URL for one image, or None if signing fails (the caller still
    returns the record; the image just won't load)."""
    try:
        return _extract_signed(_bucket().create_signed_url(image_path, SIGNED_URL_TTL_SECONDS))
    except Exception as exc:
        print(f"[STORAGE] could not sign {image_path!r}: {exc}")
        return None


def attach_image_urls(rows: list[dict]) -> list[dict]:
    """Add a signed `image_url` to each prediction row, using one batch call.
    Rows whose URL can't be created get image_url = None."""
    if not rows:
        return rows
    paths = [r["image_path"] for r in rows]
    mapping: dict[str, str] = {}
    try:
        items = _bucket().create_signed_urls(paths, SIGNED_URL_TTL_SECONDS)
        for item in items or []:
            url = _extract_signed(item)
            if url and isinstance(item, dict) and item.get("path"):
                mapping[item["path"]] = url
    except Exception as exc:
        print(f"[STORAGE] batch signing failed: {exc}")
    for r in rows:
        r["image_url"] = mapping.get(r["image_path"])
    return rows


# --- predictions (always scoped by user_id) ---

def insert_prediction(user_id: str, record: dict) -> dict:
    client = get_client()
    result = client.table("predictions").insert({**record, "user_id": user_id}).execute()
    return result.data[0]


def list_predictions(
    user_id: str, page: int, page_size: int, label: Optional[str]
) -> tuple[list[dict], int]:
    """Paginated, optionally filtered by predicted_label, newest first -
    backed by the created_at/predicted_label indexes added in Phase 2."""
    client = get_client()
    query = client.table("predictions").select("*", count="exact").eq("user_id", user_id)
    if label:
        query = query.eq("predicted_label", label)

    start = (page - 1) * page_size
    end = start + page_size - 1
    result = query.order("created_at", desc=True).range(start, end).execute()
    return attach_image_urls(result.data), result.count or 0


def get_prediction(user_id: str, prediction_id: str) -> Optional[dict]:
    """None if the id is malformed, doesn't exist, or belongs to another user."""
    if not _is_uuid(prediction_id):
        return None
    client = get_client()
    result = (
        client.table("predictions")
        .select("*")
        .eq("id", prediction_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        return None
    return attach_image_urls(result.data)[0]


def delete_prediction(user_id: str, prediction_id: str) -> bool:
    """Delete both the DB row and its storage object. Returns False if the
    row didn't exist (or isn't this user's) so the route returns a 404."""
    row = get_prediction(user_id, prediction_id)
    if row is None:
        return False

    _bucket().remove([row["image_path"]])
    get_client().table("predictions").delete().eq("id", prediction_id).eq("user_id", user_id).execute()
    return True


def update_feedback(
    user_id: str, prediction_id: str, correct: bool, corrected_label: Optional[str]
) -> Optional[dict]:
    if not _is_uuid(prediction_id):
        return None
    client = get_client()
    result = (
        client.table("predictions")
        .update({"feedback_correct": correct, "corrected_label": corrected_label})
        .eq("id", prediction_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        return None
    return attach_image_urls(result.data)[0]


# --- disease_info: global cache for Gemini-generated advice (Phase 5) ---

def get_disease_info(label: str) -> Optional[dict]:
    """Return the cached disease_info row for this exact label string
    (must match labels.json character-for-character), or None on a miss."""
    client = get_client()
    result = client.table("disease_info").select("*").eq("label", label).execute()
    return result.data[0] if result.data else None


def upsert_disease_info(label: str, advice: dict) -> None:
    """Insert or overwrite the cached advice for one label. `advice` must have
    summary/symptoms/treatment/prevention keys. generated_by keeps its table
    default ('gemini'); updated_at is set explicitly so overwrites are dated."""
    client = get_client()
    client.table("disease_info").upsert(
        {
            "label": label,
            "summary": advice["summary"],
            "symptoms": advice["symptoms"],
            "treatment": advice["treatment"],
            "prevention": advice["prevention"],
            "generated_by": "gemini",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="label",
    ).execute()


# --- stats: read-only counts over one user's `predictions` (Phase 6, per-user since Phase 7) ---

def _count(query) -> int:
    return query.execute().count or 0


def get_stats(user_id: str, top_n: int = 5) -> dict:
    """Counts for the stats page, for this user only. Uncertain scans are left
    out of the top-diseases list because their top label is probably wrong
    (section 8). The tally pages through the table 1000 rows at a time because
    PostgREST has no GROUP BY; fine for a personal-scale table."""
    client = get_client()

    def base():
        return (
            client.table("predictions")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .limit(1)
        )

    total = _count(base())
    uncertain = _count(base().eq("is_uncertain", True))
    feedback_yes = _count(base().eq("feedback_correct", True))
    feedback_no = _count(base().eq("feedback_correct", False))

    counts: dict[str, int] = {}
    page_size = 1000
    start = 0
    while True:
        rows = (
            client.table("predictions")
            .select("predicted_label")
            .eq("user_id", user_id)
            .eq("is_uncertain", False)
            .order("id")
            .range(start, start + page_size - 1)
            .execute()
            .data
        )
        for row in rows:
            label = row["predicted_label"]
            counts[label] = counts.get(label, 0) + 1
        if len(rows) < page_size:
            break
        start += page_size

    top = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:top_n]
    return {
        "total_scans": total,
        "uncertain_scans": uncertain,
        "feedback_yes": feedback_yes,
        "feedback_no": feedback_no,
        "top_diseases": [{"label": label, "count": n} for label, n in top],
    }