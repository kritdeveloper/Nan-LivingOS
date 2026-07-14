# Nan Living OS v1.0

Knowledge infrastructure for connected stories, communities, experiences, and impact in Nan.

## Curated data

The Supabase knowledge base is built with Thai-language records, normalized source citations,
and WGS84 coordinates only where a location can be verified. Apply and import with:

```bash
python scripts/apply_migrations.py
python scripts/import_nan_knowledge.py
```

Primary sources include Tourism Authority of Thailand, the Nan Provincial Office of Tourism
and Sports, Government Data Catalog, Department of Mineral Resources, Sirindhorn Anthropology
Centre community records, TAT Data API, and OpenStreetMap Nominatim for coordinate verification.

FastAPI backend organized using Clean Architecture. The default development configuration uses in-memory adapters so the API and tests run without Neo4j or an external AI provider. Production can switch the knowledge graph to Neo4j through environment variables.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
# Configure the required environment variables in your deployment platform
uvicorn nan_memory.main:app --reload
```

Open `http://localhost:8000/docs`. The development seed user is `admin@nan.local` with password `ChangeMe123!`. It is disabled outside development/test environments; change it before shared development.

## Architecture

```text
src/nan_memory/
├── domain/          # Entities, value objects, domain errors
├── application/     # Use cases and inbound/outbound ports
├── adapters/        # HTTP, repositories, graph, and AI implementations
└── infrastructure/  # Configuration, security, and dependency wiring
```

Dependencies point inward. Domain and application code do not import FastAPI, Neo4j, or provider SDKs.

## API groups

- `/api/v1/auth`: login, refresh, current profile
- `/api/v1/graph`: search, entity detail, neighbors, nearby attractions
- `/api/v1/ai`: grounded answer and enrichment proposals
- `/api/v1/recommendations`: personalized attraction and itinerary suggestions
- `/api/v1/community`: posts, contributions, moderation
- `/api/v1/dashboard`: aggregate operational metrics
- `/health/live` and `/health/ready`: health probes

## Production notes

- Replace in-memory identity/community repositories with transactional PostgreSQL adapters.
- Store refresh-token families in a durable database and rotate/revoke them on reuse.
- Put secrets in a secret manager, enforce TLS, and use an external OIDC provider where possible.
- Apply `TOURISM_KNOWLEDGE_GRAPH.md` before enabling `NAN_GRAPH_BACKEND=neo4j`.
- AI outputs are proposals and include citations; publishing or entity merges require steward review.

The graph-RAG reasoning design and its four recommendation modes are documented in `AI_REASONING_ENGINE.md`.
