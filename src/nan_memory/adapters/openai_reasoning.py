from __future__ import annotations

from pydantic import BaseModel, Field

from nan_memory.application.prompts import (
    KIND_PROMPTS,
    PLANNER_PROMPT,
    planner_input,
    synthesis_input,
    synthesis_prompt,
)
from nan_memory.domain.models import (
    Citation,
    GraphEvidence,
    ReasonedItem,
    ReasoningPlan,
    ReasoningRequest,
    ReasoningResult,
)


class _PlanOutput(BaseModel):
    theme_slugs: list[str] = Field(default_factory=list, max_length=12)
    activity_ids: list[str] = Field(default_factory=list, max_length=12)
    entity_ids: list[str] = Field(default_factory=list, max_length=12)
    community_ids: list[str] = Field(default_factory=list, max_length=12)
    transport_modes: list[str] = Field(default_factory=list, max_length=8)
    required_relationships: list[str] = Field(default_factory=list, max_length=12)
    rationale: str = Field(max_length=500)


class _ItemOutput(BaseModel):
    entity_id: str
    title: str
    score: float = Field(ge=0, le=1)
    reasons: list[str] = Field(min_length=1, max_length=5)
    evidence_ids: list[str] = Field(min_length=1, max_length=12)
    cautions: list[str] = Field(default_factory=list, max_length=5)


class _CitationOutput(BaseModel):
    entity_id: str
    title: str
    locator: str | None = None


class _ResultOutput(BaseModel):
    summary: str
    items: list[_ItemOutput] = Field(default_factory=list, max_length=20)
    citations: list[_CitationOutput] = Field(default_factory=list, max_length=30)
    assumptions: list[str] = Field(default_factory=list, max_length=10)
    grounded: bool


class OpenAIReasoningModel:
    """GPT adapter using Responses API structured outputs."""

    def __init__(self, client, model: str = "gpt-5.6"):
        self._client = client
        self._model = model

    async def plan(self, request: ReasoningRequest) -> ReasoningPlan:
        response = await self._client.responses.parse(
            model=self._model,
            reasoning={"effort": "low"},
            input=[
                {
                    "role": "developer",
                    "content": PLANNER_PROMPT + "\n\n" + KIND_PROMPTS[request.kind.value],
                },
                {"role": "user", "content": planner_input(request)},
            ],
            text_format=_PlanOutput,
        )
        output = response.output_parsed
        if output is None:
            raise RuntimeError("GPT did not return a retrieval plan")
        return ReasoningPlan(**output.model_dump())

    async def synthesize(
        self, request: ReasoningRequest, plan: ReasoningPlan, evidence: GraphEvidence
    ) -> ReasoningResult:
        response = await self._client.responses.parse(
            model=self._model,
            reasoning={"effort": "medium"},
            input=[
                {"role": "developer", "content": synthesis_prompt(request)},
                {"role": "user", "content": synthesis_input(request, plan, evidence)},
            ],
            text_format=_ResultOutput,
        )
        output = response.output_parsed
        if output is None:
            raise RuntimeError("GPT did not return a recommendation")

        permitted = {node.id for node in evidence.nodes}
        items = [
            ReasonedItem(**item.model_dump())
            for item in output.items
            if item.entity_id in permitted and set(item.evidence_ids) <= permitted
        ][: request.limit]
        citations = [
            Citation(**citation.model_dump())
            for citation in output.citations
            if citation.entity_id in permitted
        ]
        grounded = bool(items) and output.grounded
        return ReasoningResult(
            kind=request.kind,
            summary=output.summary,
            items=items,
            citations=citations,
            assumptions=[*evidence.warnings, *output.assumptions],
            model=self._model,
            grounded=grounded,
        )


class DeterministicReasoningModel:
    """Offline/test double preserving the same evidence rules."""

    model = "deterministic-test-double"

    async def plan(self, request: ReasoningRequest) -> ReasoningPlan:
        relationships = {
            "experience": ["HAS_THEME", "OFFERS", "HAS_AMENITY", "FEATURES", "NEAR"],
            "community": ["STEWARD_OF", "OFFERS", "FEATURES", "LOCATED_IN"],
            "transportation": ["ACCESSIBLE_VIA", "CONNECTS", "HAS_STOP", "NEXT_STOP", "NEAR"],
            "season": ["BEST_DURING", "AVAILABLE_DURING", "HAS_OCCURRENCE", "WEATHER_RISK"],
        }
        return ReasoningPlan(
            theme_slugs=list(request.themes),
            activity_ids=list(request.activity_ids),
            entity_ids=[
                item for item in (request.start_entity_id, *request.destination_entity_ids) if item
            ],
            community_ids=list(request.community_ids),
            transport_modes=list(request.transport_modes),
            required_relationships=relationships[request.kind.value],
            rationale="Plan derived from explicit structured filters.",
        )

    async def synthesize(
        self, request: ReasoningRequest, plan: ReasoningPlan, evidence: GraphEvidence
    ) -> ReasoningResult:
        nodes = [n for n in evidence.nodes if "Attraction" in n.labels or "Community" in n.labels]
        if not nodes:
            nodes = evidence.nodes
        items = [
            ReasonedItem(
                entity_id=node.id,
                title=node.name_th
                if request.language.startswith("th")
                else node.name_en or node.name_th,
                score=max(0.5, 0.9 - index * 0.05),
                reasons=["Connected through policy-approved graph evidence"],
                evidence_ids=[node.id],
            )
            for index, node in enumerate(nodes[: request.limit])
        ]
        return ReasoningResult(
            kind=request.kind,
            summary="Recommendations are grounded in the retrieved tourism subgraph.",
            items=items,
            citations=[
                Citation(node.id, node.name_en or node.name_th) for node in nodes[: request.limit]
            ],
            assumptions=evidence.warnings,
            model=self.model,
            grounded=bool(items),
        )
