from __future__ import annotations

import json
from collections import Counter

from nan_memory.adapters.memory import InMemoryGraphRepository
from nan_memory.application.ports import GraphSearch
from nan_memory.domain.models import (
    CommunityPost,
    ContributionStatus,
    GraphEntity,
    GraphEvidence,
    GraphRelationship,
    ReasoningPlan,
    ReasoningRequest,
    Role,
    User,
    Visibility,
)


def _json(value):
    return json.loads(value) if isinstance(value, str) else value or {}


class PostgresUserRepository:
    def __init__(self, pool):
        self.pool = pool

    @staticmethod
    def _user(row) -> User | None:
        if row is None:
            return None
        return User(
            id=row["id"], email=row["email"], display_name=row["display_name"],
            password_hash=row["password_hash"], roles=frozenset(Role(x) for x in row["roles"]),
            active=row["active"], created_at=row["created_at"],
        )

    async def get_by_id(self, user_id: str) -> User | None:
        return self._user(await self.pool.fetchrow("select * from nan_users where id=$1", user_id))

    async def get_by_email(self, email: str) -> User | None:
        return self._user(await self.pool.fetchrow("select * from nan_users where email=$1", email))

    async def count(self) -> int:
        return await self.pool.fetchval("select count(*) from nan_users")

    async def upsert(self, user: User) -> None:
        await self.pool.execute(
            """insert into nan_users(id,email,display_name,password_hash,roles,active,created_at)
            values($1,$2,$3,$4,$5,$6,$7) on conflict(id) do update set
            email=excluded.email,display_name=excluded.display_name,password_hash=excluded.password_hash,
            roles=excluded.roles,active=excluded.active""",
            user.id, user.email, user.display_name, user.password_hash,
            [role.value for role in user.roles], user.active, user.created_at,
        )


class PostgresCommunityRepository:
    def __init__(self, pool):
        self.pool = pool

    @staticmethod
    def _post(row) -> CommunityPost | None:
        if row is None:
            return None
        return CommunityPost(
            id=row["id"], author_id=row["author_id"], title=row["title"], body=row["body"],
            language=row["language"], visibility=Visibility(row["visibility"]),
            status=ContributionStatus(row["status"]), related_entity_ids=tuple(row["related_entity_ids"]),
            created_at=row["created_at"], updated_at=row["updated_at"],
        )

    async def create(self, post: CommunityPost) -> CommunityPost:
        await self.pool.execute(
            """insert into nan_community_posts
            (id,author_id,title,body,language,visibility,status,related_entity_ids,created_at,updated_at)
            values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)""",
            post.id, post.author_id, post.title, post.body, post.language, post.visibility.value,
            post.status.value, list(post.related_entity_ids), post.created_at, post.updated_at,
        )
        return post

    async def get(self, post_id: str) -> CommunityPost | None:
        return self._post(await self.pool.fetchrow("select * from nan_community_posts where id=$1", post_id))

    async def list_visible(self, allowed, status: str | None, limit: int) -> list[CommunityPost]:
        rows = await self.pool.fetch(
            """select * from nan_community_posts where visibility=any($1::text[])
            and ($2::text is null or status=$2) order by created_at desc limit $3""",
            [x.value for x in allowed], status, limit,
        )
        return [self._post(row) for row in rows]

    async def save(self, post: CommunityPost) -> CommunityPost:
        await self.pool.execute(
            """update nan_community_posts set title=$2,body=$3,language=$4,visibility=$5,
            status=$6,related_entity_ids=$7,updated_at=$8 where id=$1""",
            post.id, post.title, post.body, post.language, post.visibility.value,
            post.status.value, list(post.related_entity_ids), post.updated_at,
        )
        return post

    async def count_by_status(self) -> dict[str, int]:
        rows = await self.pool.fetch("select status,count(*) as count from nan_community_posts group by status")
        return {row["status"]: row["count"] for row in rows}


class PostgresGraphRepository:
    def __init__(self, pool):
        self.pool = pool

    @staticmethod
    def _entity(row) -> GraphEntity:
        return GraphEntity(
            id=row["id"], labels=tuple(row["labels"]), name_th=row["name_th"], name_en=row["name_en"],
            description=row["description"], latitude=row["latitude"], longitude=row["longitude"],
            visibility=Visibility(row["visibility"]), properties=_json(row["properties"]),
        )

    @staticmethod
    def _relationship(row) -> GraphRelationship:
        return GraphRelationship(row["source_id"], row["type"], row["target_id"], _json(row["properties"]))

    async def _memory(self) -> InMemoryGraphRepository:
        entities = [self._entity(row) for row in await self.pool.fetch("select * from nan_graph_entities")]
        relationships = [
            self._relationship(row) for row in await self.pool.fetch("select * from nan_graph_relationships")
        ]
        return InMemoryGraphRepository(entities, relationships)

    async def search(self, criteria: GraphSearch) -> list[GraphEntity]:
        return await (await self._memory()).search(criteria)

    async def get(self, entity_id: str, allowed: frozenset[Visibility]) -> GraphEntity | None:
        row = await self.pool.fetchrow(
            "select * from nan_graph_entities where id=$1 and visibility=any($2::text[])",
            entity_id, [x.value for x in allowed],
        )
        return self._entity(row) if row else None

    async def neighbors(self, entity_id, relationship_types, depth, limit, allowed):
        return await (await self._memory()).neighbors(
            entity_id, relationship_types, depth, limit, allowed
        )

    async def count_by_label(self) -> dict[str, int]:
        entities = [self._entity(row) for row in await self.pool.fetch("select * from nan_graph_entities")]
        counts: Counter[str] = Counter()
        for entity in entities:
            counts.update(entity.labels)
        return dict(counts)

    async def traverse_for_reasoning(
        self, request: ReasoningRequest, plan: ReasoningPlan, allowed: frozenset[Visibility]
    ) -> GraphEvidence:
        return await (await self._memory()).traverse_for_reasoning(request, plan, allowed)

    async def seed(self, entities: list[GraphEntity], relationships: list[GraphRelationship]) -> None:
        async with self.pool.acquire() as connection, connection.transaction():
            for entity in entities:
                await connection.execute(
                    """insert into nan_graph_entities
                    (id,labels,name_th,name_en,description,latitude,longitude,visibility,properties)
                    values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) on conflict(id) do nothing""",
                    entity.id, list(entity.labels), entity.name_th, entity.name_en, entity.description,
                    entity.latitude, entity.longitude, entity.visibility.value, json.dumps(entity.properties),
                )
            for rel in relationships:
                await connection.execute(
                    """insert into nan_graph_relationships(source_id,type,target_id,properties)
                    values($1,$2,$3,$4::jsonb) on conflict(source_id,type,target_id) do nothing""",
                    rel.source_id, rel.type, rel.target_id, json.dumps(rel.properties),
                )
