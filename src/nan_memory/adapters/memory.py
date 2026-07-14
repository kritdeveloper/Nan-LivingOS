from __future__ import annotations

import asyncio
import math
from collections import Counter

from nan_memory.application.ports import GraphSearch
from nan_memory.domain.models import (
    CommunityPost,
    GraphEntity,
    GraphEvidence,
    GraphRelationship,
    ReasoningPlan,
    ReasoningRequest,
    User,
    Visibility,
)


class InMemoryUserRepository:
    def __init__(self, users: list[User] | None = None):
        self._users = {user.id: user for user in users or []}

    async def get_by_id(self, user_id: str) -> User | None:
        return self._users.get(user_id)

    async def get_by_email(self, email: str) -> User | None:
        return next((u for u in self._users.values() if u.email == email), None)

    async def count(self) -> int:
        return len(self._users)


class InMemoryCommunityRepository:
    def __init__(self):
        self._posts: dict[str, CommunityPost] = {}
        self._lock = asyncio.Lock()

    async def create(self, post: CommunityPost) -> CommunityPost:
        async with self._lock:
            self._posts[post.id] = post
        return post

    async def get(self, post_id: str) -> CommunityPost | None:
        return self._posts.get(post_id)

    async def list_visible(
        self, allowed: frozenset[Visibility], status: str | None, limit: int
    ) -> list[CommunityPost]:
        values = [
            post
            for post in self._posts.values()
            if post.visibility in allowed and (status is None or post.status.value == status)
        ]
        return sorted(values, key=lambda p: p.created_at, reverse=True)[:limit]

    async def save(self, post: CommunityPost) -> CommunityPost:
        async with self._lock:
            self._posts[post.id] = post
        return post

    async def count_by_status(self) -> dict[str, int]:
        return dict(Counter(post.status.value for post in self._posts.values()))


class InMemoryGraphRepository:
    def __init__(
        self,
        entities: list[GraphEntity] | None = None,
        relationships: list[GraphRelationship] | None = None,
    ):
        self._entities = {entity.id: entity for entity in entities or []}
        self._relationships = relationships or []

    async def search(self, criteria: GraphSearch) -> list[GraphEntity]:
        values = [x for x in self._entities.values() if x.visibility in criteria.allowed_visibility]
        if criteria.labels:
            requested = set(criteria.labels)
            values = [x for x in values if requested.intersection(x.labels)]
        if criteria.query:
            terms = criteria.query.casefold().split()
            values = [
                x
                for x in values
                if any(
                    term in " ".join(filter(None, [x.name_th, x.name_en, x.description])).casefold()
                    for term in terms
                )
            ]
        if criteria.theme:
            wanted = criteria.theme.casefold()
            values = [
                x
                for x in values
                if wanted in {str(t).casefold() for t in x.properties.get("themes", [])}
            ]
        if (
            criteria.latitude is not None
            and criteria.longitude is not None
            and criteria.radius_meters is not None
        ):
            values = [
                x
                for x in values
                if x.latitude is not None
                and x.longitude is not None
                and _distance_m(criteria.latitude, criteria.longitude, x.latitude, x.longitude)
                <= criteria.radius_meters
            ]
            values.sort(
                key=lambda x: _distance_m(
                    criteria.latitude, criteria.longitude, x.latitude or 0, x.longitude or 0
                )
            )
        return values[: criteria.limit]

    async def get(self, entity_id: str, allowed: frozenset[Visibility]) -> GraphEntity | None:
        entity = self._entities.get(entity_id)
        return entity if entity and entity.visibility in allowed else None

    async def neighbors(
        self,
        entity_id: str,
        relationship_types: tuple[str, ...],
        depth: int,
        limit: int,
        allowed: frozenset[Visibility],
    ) -> list[tuple[GraphRelationship, GraphEntity]]:
        accepted = set(relationship_types)
        frontier = {entity_id}
        visited = {entity_id}
        results: list[tuple[GraphRelationship, GraphEntity]] = []
        for _ in range(depth):
            next_frontier: set[str] = set()
            for relationship in self._relationships:
                if accepted and relationship.type not in accepted:
                    continue
                if relationship.source_id in frontier:
                    target_id = relationship.target_id
                elif relationship.target_id in frontier:
                    target_id = relationship.source_id
                else:
                    continue
                entity = self._entities.get(target_id)
                if entity and entity.visibility in allowed and target_id not in visited:
                    results.append((relationship, entity))
                    next_frontier.add(target_id)
                    visited.add(target_id)
                    if len(results) >= limit:
                        return results
            frontier = next_frontier
            if not frontier:
                break
        return results

    async def count_by_label(self) -> dict[str, int]:
        counts: Counter[str] = Counter()
        for entity in self._entities.values():
            counts.update(entity.labels)
        return dict(counts)

    async def traverse_for_reasoning(
        self,
        request: ReasoningRequest,
        plan: ReasoningPlan,
        allowed: frozenset[Visibility],
    ) -> GraphEvidence:
        """Traverse from exact IDs and controlled taxonomy values; no lexical matching."""
        allowed_rel = set(plan.required_relationships)
        seeds = set(plan.entity_ids) | set(plan.community_ids)

        for entity in self._entities.values():
            themes = set(entity.properties.get("themes", []))
            activities = set(entity.properties.get("activities", []))
            modes = set(entity.properties.get("transport_modes", []))
            months = set(entity.properties.get("best_months", []))
            if themes.intersection(plan.theme_slugs):
                seeds.add(entity.id)
            if activities.intersection(plan.activity_ids):
                seeds.add(entity.id)
            if modes.intersection(plan.transport_modes):
                seeds.add(entity.id)
            if request.travel_month and request.travel_month in months:
                seeds.add(entity.id)

        if not seeds:
            # A graph-wide bounded structural seed for discovery, never text/keyword matching.
            seeds = {
                entity.id
                for entity in self._entities.values()
                if "Attraction" in entity.labels and entity.visibility in allowed
            }

        visited = set(seeds)
        frontier = set(seeds)
        selected_relationships: list[GraphRelationship] = []
        paths: list[list[str]] = [[seed] for seed in seeds]
        for _ in range(2):
            next_frontier: set[str] = set()
            for rel in self._relationships:
                if allowed_rel and rel.type not in allowed_rel:
                    continue
                if rel.source_id in frontier:
                    other = rel.target_id
                elif rel.target_id in frontier:
                    other = rel.source_id
                else:
                    continue
                entity = self._entities.get(other)
                if entity and entity.visibility in allowed:
                    selected_relationships.append(rel)
                    if other not in visited:
                        next_frontier.add(other)
                        paths.append([rel.source_id, rel.type, rel.target_id])
                        visited.add(other)
            frontier = next_frontier
            if not frontier or len(visited) >= 80:
                break

        nodes = [self._entities[item] for item in visited if item in self._entities]
        nodes = [node for node in nodes if node.visibility in allowed][:80]
        permitted = {node.id for node in nodes}
        relationships = [
            rel
            for rel in selected_relationships
            if rel.source_id in permitted and rel.target_id in permitted
        ][:160]
        return GraphEvidence(nodes, relationships, paths[:80])


def _distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat, dlon = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
