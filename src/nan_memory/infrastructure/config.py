from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


def _csv(value: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in value.split(",") if item.strip())


@dataclass(frozen=True, slots=True)
class Settings:
    environment: str
    secret_key: str
    access_token_minutes: int
    refresh_token_days: int
    allowed_origins: tuple[str, ...]
    graph_backend: str
    neo4j_uri: str
    neo4j_user: str
    neo4j_password: str
    neo4j_database: str
    ai_backend: str
    ai_base_url: str
    ai_api_key: str
    ai_model: str
    embedding_model: str
    database_url: str

    @classmethod
    def from_env(cls) -> Settings:
        environment = os.getenv("NAN_ENVIRONMENT", "development")
        secret = os.getenv("NAN_SECRET_KEY", "development-only-secret-change-before-production")
        if environment == "production" and len(secret) < 32:
            raise RuntimeError("NAN_SECRET_KEY must contain at least 32 characters in production")
        return cls(
            environment=environment,
            secret_key=secret,
            access_token_minutes=int(os.getenv("NAN_ACCESS_TOKEN_MINUTES", "30")),
            refresh_token_days=int(os.getenv("NAN_REFRESH_TOKEN_DAYS", "14")),
            allowed_origins=_csv(os.getenv("NAN_ALLOWED_ORIGINS", "http://localhost:3000")),
            graph_backend=os.getenv("NAN_GRAPH_BACKEND", "memory"),
            neo4j_uri=os.getenv("NAN_NEO4J_URI", "bolt://localhost:7687"),
            neo4j_user=os.getenv("NAN_NEO4J_USER", "neo4j"),
            neo4j_password=os.getenv("NAN_NEO4J_PASSWORD", "change-me"),
            neo4j_database=os.getenv("NAN_NEO4J_DATABASE", "neo4j"),
            ai_backend=os.getenv("NAN_AI_BACKEND", "local"),
            ai_base_url=os.getenv("NAN_AI_BASE_URL", ""),
            ai_api_key=os.getenv("NAN_AI_API_KEY", ""),
            ai_model=os.getenv("NAN_AI_MODEL", "gpt-5.6"),
            embedding_model=os.getenv("NAN_OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
            database_url=os.getenv("NAN_DATABASE_URL", ""),
        )


@lru_cache
def get_settings() -> Settings:
    return Settings.from_env()
