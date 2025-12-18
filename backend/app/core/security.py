from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


ALGORITHM = "HS256"


def create_access_token(subject: str | Any, expires_delta: timedelta) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def decrypt_token(encrypted_token: str) -> str:
    """
    Decrypt token for API usage (currently returns plain text).
    TODO: Implement proper decryption for production.

    Args:
        encrypted_token: Token string (currently plain text)

    Returns:
        Plain text token
    """
    # For development: token is stored as plain text
    # TODO: Implement decryption for production deployment

    return encrypted_token
