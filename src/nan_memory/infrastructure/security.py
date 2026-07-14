from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass

from nan_memory.domain.errors import AuthenticationError
from nan_memory.domain.models import User


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


class PBKDF2PasswordHasher:
    iterations = 600_000

    def hash(self, password: str) -> str:
        if len(password) < 12:
            raise ValueError("Password must contain at least 12 characters")
        salt = os.urandom(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, self.iterations)
        return f"pbkdf2_sha256${self.iterations}${_b64encode(salt)}${_b64encode(digest)}"

    def verify(self, password: str, encoded: str) -> bool:
        try:
            algorithm, iterations, salt, expected = encoded.split("$", 3)
            if algorithm != "pbkdf2_sha256":
                return False
            actual = hashlib.pbkdf2_hmac(
                "sha256", password.encode(), _b64decode(salt), int(iterations)
            )
            return hmac.compare_digest(actual, _b64decode(expected))
        except (ValueError, TypeError):
            return False


@dataclass(slots=True)
class HMACTokenService:
    secret: str
    access_minutes: int = 30
    refresh_days: int = 14
    issuer: str = "nan-living-memory"

    def issue_pair(self, user: User) -> dict[str, str | int]:
        now = int(time.time())
        base = {
            "sub": user.id,
            "iss": self.issuer,
            "iat": now,
            "roles": sorted(role.value for role in user.roles),
        }
        access_seconds = self.access_minutes * 60
        refresh_seconds = self.refresh_days * 86400
        return {
            "access_token": self._encode({**base, "type": "access", "exp": now + access_seconds}),
            "refresh_token": self._encode(
                {**base, "type": "refresh", "exp": now + refresh_seconds}
            ),
            "token_type": "bearer",
            "expires_in": access_seconds,
        }

    def decode(self, token: str, expected_type: str) -> dict:
        try:
            header, body, signature = token.split(".")
            signed = f"{header}.{body}".encode()
            expected = hmac.new(self.secret.encode(), signed, hashlib.sha256).digest()
            if not hmac.compare_digest(expected, _b64decode(signature)):
                raise AuthenticationError("Invalid token")
            payload = json.loads(_b64decode(body))
            if payload.get("iss") != self.issuer or payload.get("type") != expected_type:
                raise AuthenticationError("Invalid token")
            if int(payload.get("exp", 0)) <= int(time.time()):
                raise AuthenticationError("Token expired")
            return payload
        except AuthenticationError:
            raise
        except (ValueError, TypeError, KeyError, json.JSONDecodeError) as exc:
            raise AuthenticationError("Invalid token") from exc

    def _encode(self, payload: dict) -> str:
        header = _b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
        body = _b64encode(json.dumps(payload, separators=(",", ":")).encode())
        signature = hmac.new(
            self.secret.encode(), f"{header}.{body}".encode(), hashlib.sha256
        ).digest()
        return f"{header}.{body}.{_b64encode(signature)}"
