"""JWT signing and verification."""
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt as pyjwt

from app.config import settings

ALGORITHM = "HS256"


def create_token(user_id: str, role: str) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=settings.JWT_EXPIRES_HOURS)).timestamp()),
    }
    return pyjwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Raises pyjwt.PyJWTError on invalid / expired token."""
    return pyjwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
