# AI Reasoning Engine

## Pipeline

```text
Structured request
  -> GPT intent planner
  -> exact entity/taxonomy seeds
  -> policy-filtered graph traversal (maximum depth 2)
  -> evidence subgraph RAG context
  -> GPT structured recommendation
  -> server-side citation and entity-ID validation
```

The engine never performs lexical or keyword retrieval. A user request is converted into exact graph dimensions: entity IDs, community IDs, theme slugs, activity IDs, transport modes, travel month, and an allowlisted set of relationship types. Retrieval starts from those dimensions and traverses the knowledge graph. When no dimension is provided, the development adapter uses a bounded structural set of public attractions; production should use an embedding/vector seed followed by the same traversal.

## Recommendation policies

| Mode | Primary traversal |
|---|---|
| Experience | `HAS_THEME`, `OFFERS`, `HAS_AMENITY`, `SUITABLE_FOR`, `FEATURES`, `NEAR` |
| Community | `STEWARD_OF`, `OFFERS`, `FEATURES`, `LOCATED_IN` |
| Transportation | `ACCESSIBLE_VIA`, `CONNECTS`, `HAS_STOP`, `NEXT_STOP`, `NEAR` |
| Season | `BEST_DURING`, `AVAILABLE_DURING`, `HAS_OCCURRENCE`, `WEATHER_RISK` |

## Prompt templates

Prompt templates live in `src/nan_memory/application/prompts.py` and have three layers:

1. Global guardrails: graph-only evidence, cultural access, citation requirements, prompt-injection resistance, uncertainty, and no private reasoning disclosure.
2. Planner prompt: outputs normalized graph seeds and allowlisted relationship types as a structured schema.
3. Mode prompt: applies experience, community, transportation, or season-specific ranking and safety policy.

Graph data is serialized as untrusted evidence in the user payload. Instructions remain in the developer message. Both planning and synthesis use structured outputs.

## GPT configuration

```env
NAN_AI_BACKEND=openai
NAN_AI_API_KEY=...
NAN_AI_MODEL=gpt-5.6
```

The production adapter uses the OpenAI Responses API. Development and tests use a deterministic adapter with identical ports and citation validation, so no API key or network access is required.

## Request example

```json
{
  "kind": "transportation",
  "question": "How should I travel from Nan city to Doi Phu Kha?",
  "start_entity_id": "attraction-wat-phumin",
  "destination_entity_ids": ["attraction-doi-phu-kha"],
  "transport_modes": ["car"],
  "travel_month": 12,
  "language": "en",
  "limit": 5
}
```

Send it to `POST /api/v1/ai/reason`.

## Production hardening

- Add embedding-based seed retrieval for unconstrained natural-language requests, followed by graph traversal. Embeddings must carry the same visibility and consent labels as their source nodes.
- Cache only policy-equivalent requests; include policy snapshot, graph revision, prompt version, model, and language in the cache key.
- Require current authoritative connectors for live weather, road closure, timetable, fare, and event availability facts.
- Evaluate grounded precision, citation correctness, restricted-data leakage, cultural safety, route feasibility, multilingual parity, and abstention quality.
- Log IDs, prompt/model versions, latency, and token usage; never log restricted graph content or full personal prompts by default.
