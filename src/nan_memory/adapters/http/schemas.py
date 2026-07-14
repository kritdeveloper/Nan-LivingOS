from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from nan_memory.domain.models import RecommendationKind


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class LoginRequest(APIModel):
    email: str
    password: str


class RefreshRequest(APIModel):
    refresh_token: str


class CommunityPostRequest(APIModel):
    title: str = Field(min_length=3, max_length=160)
    body: str = Field(min_length=10, max_length=20_000)
    language: str = Field(default="th", min_length=2, max_length=12)
    visibility: str = "community"
    related_entity_ids: list[str] = Field(default_factory=list, max_length=50)


class ModerationRequest(APIModel):
    approve: bool


class ReasoningRequestBody(APIModel):
    kind: RecommendationKind
    question: str = Field(min_length=3, max_length=2000)
    language: str = Field(default="en", min_length=2, max_length=12)
    themes: list[str] = Field(default_factory=list, max_length=12)
    activity_ids: list[str] = Field(default_factory=list, max_length=12)
    start_entity_id: str | None = None
    destination_entity_ids: list[str] = Field(default_factory=list, max_length=12)
    community_ids: list[str] = Field(default_factory=list, max_length=12)
    transport_modes: list[str] = Field(default_factory=list, max_length=8)
    accessibility_needs: list[str] = Field(default_factory=list, max_length=12)
    travel_month: int | None = Field(default=None, ge=1, le=12)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    radius_meters: int | None = Field(default=None, ge=100, le=200_000)
    budget_level: str | None = Field(default=None, pattern="^(low|medium|high)$")
    limit: int = Field(default=8, ge=1, le=20)

    @model_validator(mode="after")
    def validate_location(self):
        supplied = [self.latitude is not None, self.longitude is not None]
        if any(supplied) and not all(supplied):
            raise ValueError("latitude and longitude must be supplied together")
        return self


class EnrichmentRequest(APIModel):
    text: str = Field(min_length=10, max_length=50_000)
    language: str = Field(default="th", min_length=2, max_length=12)


def entity_dict(entity) -> dict[str, Any]:
    return {
        "id": entity.id,
        "labels": entity.labels,
        "nameTh": entity.name_th,
        "nameEn": entity.name_en,
        "description": entity.description,
        "latitude": entity.latitude,
        "longitude": entity.longitude,
        "visibility": entity.visibility.value,
        "properties": entity.properties,
    }
