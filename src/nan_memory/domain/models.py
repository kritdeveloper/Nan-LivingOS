from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any


def utc_now() -> datetime:
    return datetime.now(UTC)


class Role(StrEnum):
    VISITOR = "visitor"
    CONTRIBUTOR = "contributor"
    CURATOR = "curator"
    ADMIN = "admin"


class Visibility(StrEnum):
    PUBLIC = "public"
    COMMUNITY = "community"
    RESTRICTED = "restricted"


class ContributionStatus(StrEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"


class RecommendationKind(StrEnum):
    EXPERIENCE = "experience"
    COMMUNITY = "community"
    TRANSPORTATION = "transportation"
    SEASON = "season"


@dataclass(slots=True)
class User:
    id: str
    email: str
    display_name: str
    password_hash: str
    roles: frozenset[Role]
    active: bool = True
    created_at: datetime = field(default_factory=utc_now)


@dataclass(slots=True)
class GraphEntity:
    id: str
    labels: tuple[str, ...]
    name_th: str
    name_en: str | None = None
    description: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    visibility: Visibility = Visibility.PUBLIC
    properties: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class GraphRelationship:
    source_id: str
    type: str
    target_id: str
    properties: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class Citation:
    entity_id: str
    title: str
    locator: str | None = None


@dataclass(slots=True)
class AIAnswer:
    answer: str
    citations: list[Citation]
    grounded: bool
    model: str


@dataclass(slots=True)
class Recommendation:
    entity: GraphEntity
    score: float
    reasons: list[str]


@dataclass(frozen=True, slots=True)
class ReasoningRequest:
    kind: RecommendationKind
    question: str
    language: str = "en"
    themes: tuple[str, ...] = ()
    activity_ids: tuple[str, ...] = ()
    start_entity_id: str | None = None
    destination_entity_ids: tuple[str, ...] = ()
    community_ids: tuple[str, ...] = ()
    transport_modes: tuple[str, ...] = ()
    accessibility_needs: tuple[str, ...] = ()
    travel_month: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    radius_meters: int | None = None
    budget_level: str | None = None
    limit: int = 8


@dataclass(slots=True)
class ReasoningPlan:
    theme_slugs: list[str] = field(default_factory=list)
    activity_ids: list[str] = field(default_factory=list)
    entity_ids: list[str] = field(default_factory=list)
    community_ids: list[str] = field(default_factory=list)
    transport_modes: list[str] = field(default_factory=list)
    required_relationships: list[str] = field(default_factory=list)
    rationale: str = ""


@dataclass(slots=True)
class GraphEvidence:
    nodes: list[GraphEntity]
    relationships: list[GraphRelationship]
    paths: list[list[str]]
    warnings: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ReasonedItem:
    entity_id: str
    title: str
    score: float
    reasons: list[str]
    evidence_ids: list[str]
    cautions: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ReasoningResult:
    kind: RecommendationKind
    summary: str
    items: list[ReasonedItem]
    citations: list[Citation]
    assumptions: list[str]
    model: str
    grounded: bool


@dataclass(slots=True)
class CommunityPost:
    id: str
    author_id: str
    title: str
    body: str
    language: str
    visibility: Visibility
    status: ContributionStatus = ContributionStatus.DRAFT
    related_entity_ids: tuple[str, ...] = ()
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
