from __future__ import annotations

from typing import Any

from nan_memory.application.ports import GraphSearch
from nan_memory.domain.models import (
    GraphEntity,
    GraphEvidence,
    GraphRelationship,
    ReasoningPlan,
    ReasoningRequest,
    Visibility,
)


class Neo4jGraphRepository:
    def __init__(self, driver: Any, database: str):
        self._driver = driver
        self._database = database

    async def search(self, criteria: GraphSearch) -> list[GraphEntity]:
        # Labels cannot be safely parameterized. This allowlist prevents Cypher injection.
        allowed_labels = {
            "Attraction",
            "TourismBusiness",
            "Event",
            "CulturalHeritage",
            "NaturalFeature",
            "Route",
            "Community",
            "Place",
        }
        labels = [x for x in criteria.labels if x in allowed_labels]
        label_clause = "" if not labels else " AND any(label IN labels(n) WHERE label IN $labels)"
        spatial_clause = ""
        if (
            criteria.latitude is not None
            and criteria.longitude is not None
            and criteria.radius_meters is not None
        ):
            spatial_clause = " AND n.location IS NOT NULL AND point.distance(n.location, point({latitude:$latitude, longitude:$longitude})) <= $radius"
        theme_clause = ""
        if criteria.theme:
            theme_clause = (
                " AND EXISTS { MATCH (n)-[:HAS_THEME]->(theme:Theme) WHERE theme.slug = $theme }"
            )
        cypher = f"""
        MATCH (n)
        WHERE n.visibility IN $visibility
          AND coalesce(n.status, 'published') = 'published'
          {label_clause}{spatial_clause}{theme_clause}
        RETURN n, labels(n) AS labels
        LIMIT $limit
        """
        records, _, _ = await self._driver.execute_query(
            cypher,
            parameters_={
                "labels": labels,
                "visibility": [x.value for x in criteria.allowed_visibility],
                "latitude": criteria.latitude,
                "longitude": criteria.longitude,
                "radius": criteria.radius_meters,
                "theme": criteria.theme,
                "limit": criteria.limit,
            },
            routing_="r",
            database_=self._database,
        )
        return [self._entity(record["n"], tuple(record["labels"])) for record in records]

    async def get(self, entity_id: str, allowed: frozenset[Visibility]) -> GraphEntity | None:
        records, _, _ = await self._driver.execute_query(
            "MATCH (n {id:$id}) WHERE n.visibility IN $visibility RETURN n, labels(n) AS labels LIMIT 1",
            id=entity_id,
            visibility=[x.value for x in allowed],
            routing_="r",
            database_=self._database,
        )
        if not records:
            return None
        return self._entity(records[0]["n"], tuple(records[0]["labels"]))

    async def neighbors(
        self,
        entity_id: str,
        relationship_types: tuple[str, ...],
        depth: int,
        limit: int,
        allowed: frozenset[Visibility],
    ) -> list[tuple[GraphRelationship, GraphEntity]]:
        # Depth is validated by the use case and interpolated because Cypher cannot parameterize it.
        records, _, _ = await self._driver.execute_query(
            f"""
            MATCH (source {{id:$id}})-[path*1..{depth}]-(target)
            WHERE target.visibility IN $visibility
              AND ($types = [] OR all(rel IN path WHERE type(rel) IN $types))
            WITH source, target, last(path) AS rel
            RETURN source.id AS sourceId, type(rel) AS type, properties(rel) AS properties,
                   target, labels(target) AS labels
            LIMIT $limit
            """,
            id=entity_id,
            visibility=[x.value for x in allowed],
            types=list(relationship_types),
            limit=limit,
            routing_="r",
            database_=self._database,
        )
        return [
            (
                GraphRelationship(
                    source_id=record["sourceId"],
                    type=record["type"],
                    target_id=record["target"].get("id"),
                    properties=dict(record["properties"]),
                ),
                self._entity(record["target"], tuple(record["labels"])),
            )
            for record in records
        ]

    async def count_by_label(self) -> dict[str, int]:
        records, _, _ = await self._driver.execute_query(
            "MATCH (n) UNWIND labels(n) AS label RETURN label, count(*) AS count",
            routing_="r",
            database_=self._database,
        )
        return {record["label"]: record["count"] for record in records}

    async def traverse_for_reasoning(
        self,
        request: ReasoningRequest,
        plan: ReasoningPlan,
        allowed: frozenset[Visibility],
    ) -> GraphEvidence:
        records, _, _ = await self._driver.execute_query(
            """
            MATCH (seed)
            WHERE seed.visibility IN $visibility
              AND coalesce(seed.status, 'published') = 'published'
              AND (
                seed.id IN $seedIds
                OR EXISTS { MATCH (seed)-[:HAS_THEME]->(t:Theme) WHERE t.slug IN $themes }
                OR EXISTS { MATCH (seed)-[:OFFERS]->(a:Activity) WHERE a.id IN $activities }
                OR EXISTS { MATCH (seed)-[:ACCESSIBLE_VIA]->(m:TransportMode) WHERE m.slug IN $modes }
                OR ($month IS NOT NULL AND EXISTS {
                    MATCH (seed)-[:BEST_DURING|AVAILABLE_DURING]->(s:Season)
                    WHERE $month IN coalesce(s.months, [])
                })
              )
            WITH DISTINCT seed LIMIT 30
            MATCH path=(seed)-[rels*0..2]-(target)
            WHERE target.visibility IN $visibility
              AND coalesce(target.status, 'published') = 'published'
              AND all(rel IN rels WHERE type(rel) IN $relationshipTypes)
            RETURN [node IN nodes(path) | {
                       id:node.id, labels:labels(node), properties:properties(node)
                   }] AS nodes,
                   [rel IN rels | {
                       sourceId:startNode(rel).id, type:type(rel),
                       targetId:endNode(rel).id, properties:properties(rel)
                   }] AS relationships
            LIMIT 120
            """,
            seedIds=list({*plan.entity_ids, *plan.community_ids}),
            themes=plan.theme_slugs,
            activities=plan.activity_ids,
            modes=plan.transport_modes,
            month=request.travel_month,
            relationshipTypes=plan.required_relationships,
            visibility=[item.value for item in allowed],
            routing_="r",
            database_=self._database,
        )
        nodes: dict[str, GraphEntity] = {}
        relationships: dict[tuple[str, str, str], GraphRelationship] = {}
        paths: list[list[str]] = []
        for record in records:
            path: list[str] = []
            for item in record["nodes"]:
                entity = self._entity(item["properties"], tuple(item["labels"]))
                nodes[entity.id] = entity
                path.append(entity.id)
            for item in record["relationships"]:
                rel = GraphRelationship(
                    item["sourceId"], item["type"], item["targetId"], dict(item["properties"])
                )
                relationships[(rel.source_id, rel.type, rel.target_id)] = rel
            paths.append(path)
        warnings = []
        if request.kind.value in {"transportation", "season"}:
            warnings.append("Verify time-sensitive conditions with an authoritative live source.")
        return GraphEvidence(list(nodes.values()), list(relationships.values()), paths, warnings)

    @staticmethod
    def _entity(node: Any, labels: tuple[str, ...]) -> GraphEntity:
        location = node.get("location")
        excluded = {"id", "nameTh", "nameEn", "descriptionEn", "location", "visibility"}
        return GraphEntity(
            id=node.get("id"),
            labels=labels,
            name_th=node.get("nameTh", ""),
            name_en=node.get("nameEn"),
            description=node.get("descriptionEn"),
            latitude=getattr(location, "latitude", None),
            longitude=getattr(location, "longitude", None),
            visibility=Visibility(node.get("visibility", "public")),
            properties={key: value for key, value in dict(node).items() if key not in excluded},
        )
