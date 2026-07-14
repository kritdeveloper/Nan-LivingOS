from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from nan_memory.domain.models import (
    AIAnswer,
    CommunityPost,
    GraphEntity,
    GraphEvidence,
    GraphRelationship,
    ReasoningPlan,
    ReasoningRequest,
    ReasoningResult,
    User,
    Visibility,
)


@dataclass(frozen=True, slots=True)
class GraphSearch:
    query: str | None = None
    labels: tuple[str, ...] = ()
    theme: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    radius_meters: int | None = None
    limit: int = 20
    allowed_visibility: frozenset[Visibility] = frozenset({Visibility.PUBLIC})


class UserRepository(Protocol):
    async def get_by_id(self, user_id: str) -> User | None: ...
    async def get_by_email(self, email: str) -> User | None: ...
    async def count(self) -> int: ...


class GraphRepository(Protocol):
    async def search(self, criteria: GraphSearch) -> list[GraphEntity]: ...
    async def get(self, entity_id: str, allowed: frozenset[Visibility]) -> GraphEntity | None: ...
    async def neighbors(
        self,
        entity_id: str,
        relationship_types: tuple[str, ...],
        depth: int,
        limit: int,
        allowed: frozenset[Visibility],
    ) -> list[tuple[GraphRelationship, GraphEntity]]: ...
    async def count_by_label(self) -> dict[str, int]: ...


class AIProvider(Protocol):
    async def answer(
        self, question: str, context: list[GraphEntity], language: str
    ) -> AIAnswer: ...
    async def propose_enrichment(self, text: str, language: str) -> dict: ...


class ReasoningModel(Protocol):
    async def plan(self, request: ReasoningRequest) -> ReasoningPlan: ...
    async def synthesize(
        self, request: ReasoningRequest, plan: ReasoningPlan, evidence: GraphEvidence
    ) -> ReasoningResult: ...


class ReasoningGraphRepository(Protocol):
    async def traverse_for_reasoning(
        self,
        request: ReasoningRequest,
        plan: ReasoningPlan,
        allowed: frozenset[Visibility],
    ) -> GraphEvidence: ...


class CommunityRepository(Protocol):
    async def create(self, post: CommunityPost) -> CommunityPost: ...
    async def get(self, post_id: str) -> CommunityPost | None: ...
    async def list_visible(
        self, allowed: frozenset[Visibility], status: str | None, limit: int
    ) -> list[CommunityPost]: ...
    async def save(self, post: CommunityPost) -> CommunityPost: ...
    async def count_by_status(self) -> dict[str, int]: ...


class PasswordHasher(Protocol):
    def hash(self, password: str) -> str: ...
    def verify(self, password: str, encoded: str) -> bool: ...


class TokenService(Protocol):
    def issue_pair(self, user: User) -> dict[str, str | int]: ...
    def decode(self, token: str, expected_type: str) -> dict: ...
