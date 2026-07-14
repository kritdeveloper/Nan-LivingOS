from __future__ import annotations

from dataclasses import dataclass

from nan_memory.adapters.ai import LocalGroundedAIProvider
from nan_memory.adapters.memory import (
    InMemoryCommunityRepository,
    InMemoryGraphRepository,
    InMemoryUserRepository,
)
from nan_memory.adapters.openai_reasoning import DeterministicReasoningModel, OpenAIReasoningModel
from nan_memory.application.services import (
    AIService,
    AuthService,
    CommunityService,
    DashboardService,
    GraphService,
    ReasoningEngine,
    RecommendationService,
)
from nan_memory.domain.models import GraphEntity, GraphRelationship, Role, User, Visibility
from nan_memory.infrastructure.config import Settings
from nan_memory.infrastructure.security import HMACTokenService, PBKDF2PasswordHasher


@dataclass(slots=True)
class Container:
    settings: Settings
    users: object
    graph: object
    community: object
    auth: AuthService
    graph_service: GraphService
    ai: AIService
    recommendations: RecommendationService
    community_service: CommunityService
    dashboard: DashboardService
    reasoning: ReasoningEngine
    neo4j_driver: object | None = None
    database_pool: object | None = None
    database_status: str = "not_configured"

    async def connect_database(self) -> None:
        if not self.settings.database_url or self.settings.environment == "test":
            return
        import asyncpg

        try:
            self.database_pool = await asyncpg.create_pool(
                self.settings.database_url,
                min_size=1,
                max_size=5,
                command_timeout=10,
                server_settings={"application_name": "nan-living-os"},
            )
            self.database_status = "connected"
        except (OSError, asyncpg.PostgresError):
            self.database_status = "unavailable"

    async def activate_database_repositories(self) -> None:
        if self.database_pool is None:
            return
        from nan_memory.adapters.postgres import (
            PostgresCommunityRepository,
            PostgresGraphRepository,
            PostgresUserRepository,
        )

        passwords = PBKDF2PasswordHasher()
        users = PostgresUserRepository(self.database_pool)
        graph = PostgresGraphRepository(self.database_pool)
        community = PostgresCommunityRepository(self.database_pool)

        await users.upsert(
            User(
                id="user-admin",
                email="admin@nan.local",
                display_name="Nan Administrator",
                password_hash=passwords.hash("ChangeMe123!"),
                roles=frozenset({Role.ADMIN, Role.CURATOR, Role.CONTRIBUTOR}),
            )
        )
        token_service = HMACTokenService(
            self.settings.secret_key,
            self.settings.access_token_minutes,
            self.settings.refresh_token_days,
        )
        self.users = users
        self.graph = graph
        self.community = community
        self.auth = AuthService(users, passwords, token_service)
        self.graph_service = GraphService(graph)
        self.ai = AIService(graph, LocalGroundedAIProvider())
        self.recommendations = RecommendationService(graph)
        self.community_service = CommunityService(community)
        self.dashboard = DashboardService(users, graph, community)
        self.reasoning.graph = graph

    async def close(self) -> None:
        if self.database_pool is not None:
            await self.database_pool.close()
        if self.neo4j_driver is not None:
            await self.neo4j_driver.close()


def build_container(settings: Settings) -> Container:
    passwords = PBKDF2PasswordHasher()
    users = InMemoryUserRepository(
        [
            User(
                id="user-admin",
                email="admin@nan.local",
                display_name="Nan Administrator",
                password_hash=passwords.hash("ChangeMe123!"),
                roles=frozenset({Role.ADMIN, Role.CURATOR, Role.CONTRIBUTOR}),
            )
        ]
        if settings.environment in {"development", "test"}
        else []
    )
    entities, relationships = _seed_graph()
    driver = None
    if settings.graph_backend == "neo4j":
        from neo4j import AsyncGraphDatabase

        from nan_memory.adapters.neo4j_graph import Neo4jGraphRepository

        driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
        graph = Neo4jGraphRepository(driver, settings.neo4j_database)
    else:
        graph = InMemoryGraphRepository(entities, relationships)
    community = InMemoryCommunityRepository()
    token_service = HMACTokenService(
        settings.secret_key, settings.access_token_minutes, settings.refresh_token_days
    )

    if settings.ai_backend == "openai":
        if not settings.ai_api_key:
            raise RuntimeError("NAN_AI_API_KEY is required when NAN_AI_BACKEND=openai")
        from openai import AsyncOpenAI

        model = OpenAIReasoningModel(
            AsyncOpenAI(api_key=settings.ai_api_key, base_url=settings.ai_base_url or None),
            settings.ai_model,
        )
    else:
        model = DeterministicReasoningModel()

    return Container(
        settings=settings,
        users=users,
        graph=graph,
        community=community,
        auth=AuthService(users, passwords, token_service),
        graph_service=GraphService(graph),
        ai=AIService(graph, LocalGroundedAIProvider()),
        recommendations=RecommendationService(graph),
        community_service=CommunityService(community),
        dashboard=DashboardService(users, graph, community),
        reasoning=ReasoningEngine(graph, model),
        neo4j_driver=driver,
    )


def _seed_graph() -> tuple[list[GraphEntity], list[GraphRelationship]]:
    public = Visibility.PUBLIC
    entities = [
        GraphEntity(
            "attraction-wat-phumin",
            ("Place", "Attraction"),
            "วัดภูมินทร์",
            "Wat Phumin",
            "Historic temple in Nan city.",
            18.775,
            100.771,
            public,
            {
                "themes": ["culture", "architecture"],
                "activities": ["activity-sightseeing", "activity-photography"],
                "best_months": [11, 12, 1, 2],
            },
        ),
        GraphEntity(
            "attraction-nan-national-museum",
            ("Place", "Attraction"),
            "พิพิธภัณฑสถานแห่งชาติ น่าน",
            "Nan National Museum",
            "Museum presenting Nan history and culture.",
            18.776,
            100.771,
            public,
            {
                "themes": ["culture", "history"],
                "activities": ["activity-learning"],
                "best_months": list(range(1, 13)),
            },
        ),
        GraphEntity(
            "attraction-doi-phu-kha",
            ("Place", "Attraction"),
            "อุทยานแห่งชาติดอยภูคา",
            "Doi Phu Kha National Park",
            "Mountain national park in Nan.",
            19.20,
            101.08,
            public,
            {
                "themes": ["nature"],
                "activities": ["activity-hiking", "activity-photography"],
                "transport_modes": ["car"],
                "best_months": [11, 12, 1, 2],
            },
        ),
        GraphEntity(
            "community-bo-kluea",
            ("Place", "Community"),
            "ชุมชนบ่อเกลือ",
            "Bo Kluea Community",
            "Community associated with traditional salt heritage.",
            19.15,
            101.16,
            public,
            {
                "themes": ["culture", "community"],
                "activities": ["activity-learning"],
                "transport_modes": ["car"],
                "best_months": [11, 12, 1, 2],
            },
        ),
        GraphEntity(
            "heritage-salt-making",
            ("CulturalHeritage",),
            "ภูมิปัญญาการทำเกลือ",
            "Traditional Salt Making",
            "Community-held salt-making knowledge.",
            visibility=public,
            properties={"sensitivity": "public"},
        ),
        GraphEntity("transport-car", ("TransportMode",), "รถยนต์", "Car", visibility=public),
        GraphEntity(
            "season-cool",
            ("Season",),
            "ฤดูหนาว",
            "Cool Season",
            visibility=public,
            properties={"months": [11, 12, 1, 2]},
        ),
    ]
    relationships = [
        GraphRelationship(
            "attraction-wat-phumin",
            "NEAR",
            "attraction-nan-national-museum",
            {"distanceMeters": 250},
        ),
        GraphRelationship(
            "community-bo-kluea",
            "STEWARD_OF",
            "heritage-salt-making",
            {"role": "community steward"},
        ),
        GraphRelationship("community-bo-kluea", "FEATURES", "heritage-salt-making"),
        GraphRelationship(
            "attraction-doi-phu-kha",
            "ACCESSIBLE_VIA",
            "transport-car",
            {"verifyRoadConditions": True},
        ),
        GraphRelationship(
            "community-bo-kluea", "ACCESSIBLE_VIA", "transport-car", {"verifyRoadConditions": True}
        ),
        GraphRelationship("attraction-doi-phu-kha", "BEST_DURING", "season-cool"),
        GraphRelationship("community-bo-kluea", "BEST_DURING", "season-cool"),
    ]
    return entities, relationships
