from __future__ import annotations

from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request

from nan_memory.adapters.http.dependencies import container, current_user, optional_user
from nan_memory.adapters.http.schemas import (
    CommunityPostRequest,
    EnrichmentRequest,
    LoginRequest,
    ModerationRequest,
    ReasoningRequestBody,
    RefreshRequest,
    entity_dict,
)
from nan_memory.application.ports import GraphSearch
from nan_memory.application.services import visibility_for
from nan_memory.domain.models import ReasoningRequest, User, Visibility

router = APIRouter(prefix="/api/v1")


@router.post("/auth/login", tags=["Authentication"])
async def login(body: LoginRequest, app=Depends(container)):
    return await app.auth.login(body.email, body.password)


@router.post("/auth/refresh", tags=["Authentication"])
async def refresh(body: RefreshRequest, app=Depends(container)):
    return await app.auth.refresh(body.refresh_token)


@router.get("/auth/me", tags=["Authentication"])
async def me(user: Annotated[User, Depends(current_user)]):
    return {
        "id": user.id,
        "email": user.email,
        "displayName": user.display_name,
        "roles": [r.value for r in user.roles],
    }


@router.get("/graph/entities", tags=["Knowledge Graph"])
async def graph_entities(
    user: Annotated[User | None, Depends(optional_user)],
    q: str | None = None,
    labels: Annotated[list[str] | None, Query()] = None,
    theme: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    radius_meters: int | None = Query(default=None, ge=100, le=200_000),
    limit: int = Query(default=20, ge=1, le=100),
    app=Depends(container),
):
    criteria = GraphSearch(
        query=q,
        labels=tuple(labels or ()),
        theme=theme,
        latitude=latitude,
        longitude=longitude,
        radius_meters=radius_meters,
        limit=limit,
        allowed_visibility=visibility_for(user),
    )
    return {"items": [entity_dict(item) for item in await app.graph_service.search(criteria)]}


@router.get("/graph/entities/{entity_id}", tags=["Knowledge Graph"])
async def graph_entity(
    entity_id: str, user: Annotated[User | None, Depends(optional_user)], app=Depends(container)
):
    return entity_dict(await app.graph_service.get(entity_id, user))


@router.get("/graph/entities/{entity_id}/sources", tags=["Knowledge Graph"])
async def graph_entity_sources(
    entity_id: str, user: Annotated[User | None, Depends(optional_user)], app=Depends(container)
):
    await app.graph_service.get(entity_id, user)
    if app.database_pool is None:
        return {"items": []}
    rows = await app.database_pool.fetch(
        """select s.id,s.title,s.url,s.publisher,s.source_type,es.role,s.accessed_at
        from nan_entity_sources es join nan_sources s on s.id=es.source_id
        where es.entity_id=$1 order by es.role,s.publisher""",
        entity_id,
    )
    return {"items": [dict(row) for row in rows]}


@router.get("/graph/entities/{entity_id}/neighbors", tags=["Knowledge Graph"])
async def graph_neighbors(
    entity_id: str,
    user: Annotated[User | None, Depends(optional_user)],
    relationship_types: Annotated[list[str] | None, Query()] = None,
    depth: int = Query(default=1, ge=1, le=3),
    limit: int = Query(default=20, ge=1, le=100),
    app=Depends(container),
):
    values = await app.graph_service.neighbors(
        entity_id, tuple(relationship_types or ()), depth, limit, user
    )
    return {
        "items": [
            {"relationship": asdict(rel), "entity": entity_dict(entity)} for rel, entity in values
        ]
    }


@router.post("/ai/reason", tags=["AI Reasoning"])
async def reason(
    body: ReasoningRequestBody,
    user: Annotated[User | None, Depends(optional_user)],
    app=Depends(container),
):
    request = ReasoningRequest(
        kind=body.kind,
        question=body.question,
        language=body.language,
        themes=tuple(body.themes),
        activity_ids=tuple(body.activity_ids),
        start_entity_id=body.start_entity_id,
        destination_entity_ids=tuple(body.destination_entity_ids),
        community_ids=tuple(body.community_ids),
        transport_modes=tuple(body.transport_modes),
        accessibility_needs=tuple(body.accessibility_needs),
        travel_month=body.travel_month,
        latitude=body.latitude,
        longitude=body.longitude,
        radius_meters=body.radius_meters,
        budget_level=body.budget_level,
        limit=body.limit,
    )
    return asdict(await app.reasoning.recommend(request, user))


@router.post("/ai/enrich", tags=["AI"])
async def enrich(
    body: EnrichmentRequest, user: Annotated[User, Depends(current_user)], app=Depends(container)
):
    return await app.ai.enrich(body.text, body.language, user)


@router.get("/recommendations", tags=["Recommendation"])
async def recommendations(
    user: Annotated[User | None, Depends(optional_user)],
    themes: Annotated[list[str] | None, Query()] = None,
    latitude: float | None = None,
    longitude: float | None = None,
    radius_meters: int | None = Query(default=None, ge=100, le=200_000),
    limit: int = Query(default=8, ge=1, le=20),
    app=Depends(container),
):
    values = await app.recommendations.recommend(
        user, tuple(themes or ()), latitude, longitude, radius_meters, limit
    )
    return {
        "items": [
            {"entity": entity_dict(item.entity), "score": item.score, "reasons": item.reasons}
            for item in values
        ]
    }


@router.post("/community/posts", tags=["Community"])
async def create_post(
    body: CommunityPostRequest, user: Annotated[User, Depends(current_user)], app=Depends(container)
):
    post = await app.community_service.create(
        user,
        body.title,
        body.body,
        body.language,
        Visibility(body.visibility),
        tuple(body.related_entity_ids),
    )
    return asdict(post)


@router.get("/community/posts", tags=["Community"])
async def list_posts(
    user: Annotated[User | None, Depends(optional_user)],
    status: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    app=Depends(container),
):
    return {
        "items": [
            asdict(p) for p in await app.community.list_visible(visibility_for(user), status, limit)
        ]
    }


@router.post("/community/posts/{post_id}/submit", tags=["Community"])
async def submit_post(
    post_id: str, user: Annotated[User, Depends(current_user)], app=Depends(container)
):
    return asdict(await app.community_service.submit(post_id, user))


@router.post("/community/posts/{post_id}/moderate", tags=["Community"])
async def moderate_post(
    post_id: str,
    body: ModerationRequest,
    user: Annotated[User, Depends(current_user)],
    app=Depends(container),
):
    return asdict(await app.community_service.moderate(post_id, body.approve, user))


@router.get("/dashboard/summary", tags=["Dashboard"])
async def dashboard(user: Annotated[User, Depends(current_user)], app=Depends(container)):
    return await app.dashboard.summary(user)


@router.get("/health/live", include_in_schema=False)
async def live():
    return {"status": "ok"}


@router.get("/health/ready", include_in_schema=False)
async def ready(request: Request):
    app = request.app.state.container
    database_status = app.database_status
    if app.database_pool is not None:
        async with app.database_pool.acquire() as connection:
            await connection.fetchval("select 1")
        database_status = "connected"
    return {
        "status": "ready" if database_status != "unavailable" else "degraded",
        "graphBackend": "postgres" if app.database_pool is not None else app.settings.graph_backend,
        "database": database_status,
    }
