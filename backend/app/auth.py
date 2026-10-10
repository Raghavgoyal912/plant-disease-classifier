"""Verifies the Supabase access token and returns the user's id.

Supabase signs tokens with ES256. Public keys come from the project's JWKS
endpoint, so no shared secret is needed. Used as a FastAPI dependency:
    user_id: str = Depends(get_current_user)
"""
import logging

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.config import settings  # <-- adjust if config.py exposes the URL differently

logger = logging.getLogger(__name__)

_SUPABASE_URL = settings.SUPABASE_URL.rstrip("/")
_ISSUER = f"{_SUPABASE_URL}/auth/v1"
_jwks_client = PyJWKClient(
    f"{_ISSUER}/.well-known/jwks.json", cache_keys=True, timeout=10
)

# auto_error=False so a missing header gives our 401, not FastAPI's 403
_bearer = HTTPBearer(auto_error=False)


def _unauthorized(message: str) -> HTTPException:
    return HTTPException(
        status_code=401,
        detail=message,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    if creds is None or not creds.credentials:
        raise _unauthorized("Missing access token.")
    token = creds.credentials
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
            issuer=_ISSUER,
        )
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Access token expired.")
    except jwt.PyJWTError as exc:
        logger.warning("Rejected token: %s", exc)
        raise _unauthorized("Invalid access token.")

    user_id = claims.get("sub")
    if not user_id:
        raise _unauthorized("Invalid access token.")
    return user_id