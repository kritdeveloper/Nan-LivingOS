from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from nan_memory.adapters.http.routes import router
from nan_memory.domain.errors import (
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    DomainError,
    NotFoundError,
    ValidationError,
)
from nan_memory.infrastructure.config import get_settings
from nan_memory.infrastructure.container import build_container


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.container = build_container(get_settings())
    await app.state.container.connect_database()
    await app.state.container.activate_database_repositories()
    yield
    await app.state.container.close()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Nan Living OS API",
        version="1.0.0",
        description="Consent-first tourism knowledge graph and graph-RAG reasoning API.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "If-Match"],
    )

    @app.exception_handler(DomainError)
    async def domain_error(_: Request, exc: DomainError):
        status = 400
        if isinstance(exc, AuthenticationError):
            status = 401
        elif isinstance(exc, AuthorizationError):
            status = 403
        elif isinstance(exc, NotFoundError):
            status = 404
        elif isinstance(exc, ConflictError):
            status = 409
        elif isinstance(exc, ValidationError):
            status = 422
        return JSONResponse(
            status_code=status, content={"type": "about:blank", "title": str(exc), "status": status}
        )

    app.include_router(router)
    return app


app = create_app()
