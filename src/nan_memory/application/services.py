from __future__ import annotations

import math
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from nan_memory.application.ports import (
    AIProvider,
    CommunityRepository,
    GraphRepository,
    GraphSearch,
    PasswordHasher,
    ReasoningGraphRepository,
    ReasoningModel,
    TokenService,
    UserRepository,
)
from nan_memory.domain.errors import (
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    NotFoundError,
    ValidationError,
)
from nan_memory.domain.models import (
    AIAnswer,
    CommunityPost,
    ContributionStatus,
    ReasoningRequest,
    ReasoningResult,
    Recommendation,
    Role,
    User,
    Visibility,
)


def visibility_for(user: User | None) -> frozenset[Visibility]:
    if user is None:
        return frozenset({Visibility.PUBLIC})
    if Role.CURATOR in user.roles or Role.ADMIN in user.roles:
        return frozenset(Visibility)
    return frozenset({Visibility.PUBLIC, Visibility.COMMUNITY})


@dataclass(slots=True)
class AuthService:
    users: UserRepository
    passwords: PasswordHasher
    tokens: TokenService

    async def login(self, email: str, password: str) -> dict[str, str | int]:
        user = await self.users.get_by_email(email.strip().lower())
        if (
            user is None
            or not user.active
            or not self.passwords.verify(password, user.password_hash)
        ):
            raise AuthenticationError("Invalid email or password")
        return self.tokens.issue_pair(user)

    async def refresh(self, refresh_token: str) -> dict[str, str | int]:
        payload = self.tokens.decode(refresh_token, "refresh")
        user = await self.users.get_by_id(payload["sub"])
        if user is None or not user.active:
            raise AuthenticationError("Account is unavailable")
        return self.tokens.issue_pair(user)


@dataclass(slots=True)
class GraphService:
    graph: GraphRepository

    async def search(self, criteria: GraphSearch):
        return await self.graph.search(criteria)

    async def get(self, entity_id: str, user: User | None):
        entity = await self.graph.get(entity_id, visibility_for(user))
        if entity is None:
            raise NotFoundError("Entity not found")
        return entity

    async def neighbors(
        self,
        entity_id: str,
        relationship_types: tuple[str, ...],
        depth: int,
        limit: int,
        user: User | None,
    ):
        if depth < 1 or depth > 3:
            raise ValidationError("Depth must be between 1 and 3")
        if relationship_types and not all(
            re.fullmatch(r"[A-Z][A-Z0-9_]*", x) for x in relationship_types
        ):
            raise ValidationError("Invalid relationship type")
        await self.get(entity_id, user)
        return await self.graph.neighbors(
            entity_id, relationship_types, depth, min(limit, 100), visibility_for(user)
        )


@dataclass(slots=True)
class AIService:
    graph: GraphRepository
    provider: AIProvider

    async def answer(self, question: str, language: str, user: User | None) -> AIAnswer:
        if len(question.strip()) < 3:
            raise ValidationError("Question is too short")
        context = await self.graph.search(
            GraphSearch(query=question, limit=8, allowed_visibility=visibility_for(user))
        )
        return await self.provider.answer(question, context, language)

    async def enrich(self, text: str, language: str, user: User) -> dict:
        if not ({Role.CURATOR, Role.ADMIN} & user.roles):
            raise AuthorizationError("Curator role required")
        if len(text.strip()) < 10:
            raise ValidationError("Text is too short")
        proposal = await self.provider.propose_enrichment(text, language)
        return {**proposal, "status": "proposed", "requiresHumanReview": True}


@dataclass(slots=True)
class RecommendationService:
    graph: GraphRepository

    async def recommend(
        self,
        user: User | None,
        themes: tuple[str, ...],
        latitude: float | None,
        longitude: float | None,
        radius_meters: int | None,
        limit: int,
    ) -> list[Recommendation]:
        allowed = visibility_for(user)
        candidates = await self.graph.search(
            GraphSearch(
                labels=("Attraction",),
                latitude=latitude,
                longitude=longitude,
                radius_meters=radius_meters,
                limit=min(max(limit * 4, 20), 100),
                allowed_visibility=allowed,
            )
        )
        results: list[Recommendation] = []
        wanted = {x.casefold() for x in themes}
        for entity in candidates:
            actual = {str(x).casefold() for x in entity.properties.get("themes", [])}
            matches = wanted & actual
            score = 0.45 + min(len(matches) * 0.2, 0.4)
            reasons = [f"Matches theme: {theme}" for theme in sorted(matches)]
            if latitude is not None and longitude is not None and entity.latitude is not None:
                km = _haversine(latitude, longitude, entity.latitude, entity.longitude or 0)
                score += max(0, 0.15 - km / 1000)
                reasons.append(f"Approximately {km:.1f} km away")
            if not reasons:
                reasons.append("Popular public attraction")
            results.append(Recommendation(entity, round(min(score, 1.0), 3), reasons))
        return sorted(results, key=lambda item: item.score, reverse=True)[:limit]


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat, dlon = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@dataclass(slots=True)
class CommunityService:
    posts: CommunityRepository

    async def create(
        self,
        user: User,
        title: str,
        body: str,
        language: str,
        visibility: Visibility,
        related_entity_ids: tuple[str, ...],
    ) -> CommunityPost:
        if not ({Role.CONTRIBUTOR, Role.CURATOR, Role.ADMIN} & user.roles):
            raise AuthorizationError("Contributor role required")
        post = CommunityPost(
            id=str(uuid4()),
            author_id=user.id,
            title=title.strip(),
            body=body.strip(),
            language=language,
            visibility=visibility,
            related_entity_ids=related_entity_ids,
        )
        return await self.posts.create(post)

    async def submit(self, post_id: str, user: User) -> CommunityPost:
        post = await self.posts.get(post_id)
        if post is None:
            raise NotFoundError("Post not found")
        if post.author_id != user.id and not ({Role.CURATOR, Role.ADMIN} & user.roles):
            raise AuthorizationError("Not allowed to submit this post")
        if post.status != ContributionStatus.DRAFT:
            raise ConflictError("Only draft posts can be submitted")
        post.status = ContributionStatus.SUBMITTED
        post.updated_at = datetime.now(UTC)
        return await self.posts.save(post)

    async def moderate(self, post_id: str, approve: bool, user: User) -> CommunityPost:
        if not ({Role.CURATOR, Role.ADMIN} & user.roles):
            raise AuthorizationError("Curator role required")
        post = await self.posts.get(post_id)
        if post is None:
            raise NotFoundError("Post not found")
        if post.status != ContributionStatus.SUBMITTED:
            raise ConflictError("Only submitted posts can be moderated")
        post.status = ContributionStatus.APPROVED if approve else ContributionStatus.REJECTED
        post.updated_at = datetime.now(UTC)
        return await self.posts.save(post)


@dataclass(slots=True)
class DashboardService:
    users: UserRepository
    graph: GraphRepository
    posts: CommunityRepository

    async def summary(self, user: User) -> dict:
        if not ({Role.CURATOR, Role.ADMIN} & user.roles):
            raise AuthorizationError("Curator role required")
        return {
            "users": await self.users.count(),
            "graphNodesByLabel": await self.graph.count_by_label(),
            "communityPostsByStatus": await self.posts.count_by_status(),
            "generatedAt": datetime.now(UTC).isoformat(),
        }


@dataclass(slots=True)
class ReasoningEngine:
    """Orchestrates GPT planning, graph traversal retrieval, and grounded synthesis."""

    graph: ReasoningGraphRepository
    model: ReasoningModel

    async def recommend(self, request: ReasoningRequest, user: User | None) -> ReasoningResult:
        if len(request.question.strip()) < 3:
            raise ValidationError("Question is too short")
        if request.travel_month is not None and not 1 <= request.travel_month <= 12:
            raise ValidationError("travel_month must be between 1 and 12")
        if request.limit < 1 or request.limit > 20:
            raise ValidationError("limit must be between 1 and 20")

        plan = await self.model.plan(request)
        evidence = await self.graph.traverse_for_reasoning(request, plan, visibility_for(user))
        if not evidence.nodes:
            return ReasoningResult(
                kind=request.kind,
                summary="No policy-approved graph evidence matched the request.",
                items=[],
                citations=[],
                assumptions=evidence.warnings,
                model="none",
                grounded=False,
            )
        return await self.model.synthesize(request, plan, evidence)
