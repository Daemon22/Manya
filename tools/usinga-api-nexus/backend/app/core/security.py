from datetime import datetime, timedelta, timezone
import base64
import hmac
import os
from hashlib import pbkdf2_hmac, sha256

from cryptography.fernet import Fernet
from jose import jwt

from app.core.config import get_settings


ALGORITHM = "HS256"
PBKDF2_ITERATIONS = 260_000


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(digest).decode()}"


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        algorithm, iterations, encoded_salt, encoded_digest = hashed_password.split("$", 3)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    salt = base64.urlsafe_b64decode(encoded_salt.encode())
    expected = base64.urlsafe_b64decode(encoded_digest.encode())
    actual = pbkdf2_hmac("sha256", password.encode(), salt, int(iterations))
    return hmac.compare_digest(actual, expected)


def create_access_token(subject: str) -> str:
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": subject, "exp": expires}, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> str:
    settings = get_settings()
    payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    return str(payload["sub"])


def _fernet() -> Fernet:
    settings = get_settings()
    if settings.encryption_key:
        key = settings.encryption_key.encode()
    else:
        digest = sha256(settings.secret_key.encode()).digest()
        key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_secret(secret: str) -> str:
    return _fernet().encrypt(secret.encode()).decode()


def decrypt_secret(token: str) -> str:
    return _fernet().decrypt(token.encode()).decode()


def secret_fingerprint(secret: str) -> str:
    return sha256(secret.encode()).hexdigest()[:16]
