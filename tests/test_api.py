import pytest
from httpx import ASGITransport, AsyncClient

from nan_memory.main import create_app


def make_client(app):
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest.mark.asyncio
async def test_authentication_and_dashboard(monkeypatch):
    monkeypatch.setenv("NAN_ENVIRONMENT", "test")
    app = create_app()
    async with app.router.lifespan_context(app), make_client(app) as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@nan.local", "password": "ChangeMe123!"},
        )
        assert login.status_code == 200
        token = login.json()["access_token"]
        dashboard = await client.get(
            "/api/v1/dashboard/summary",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert dashboard.status_code == 200
        assert dashboard.json()["users"] == 1


@pytest.mark.asyncio
async def test_all_graph_reasoning_modes(monkeypatch):
    monkeypatch.setenv("NAN_ENVIRONMENT", "test")
    app = create_app()
    async with app.router.lifespan_context(app), make_client(app) as client:
        inputs = {
            "experience": {"themes": ["culture"]},
            "community": {"community_ids": ["community-bo-kluea"]},
            "transportation": {
                "start_entity_id": "attraction-doi-phu-kha",
                "transport_modes": ["car"],
            },
            "season": {"travel_month": 12},
        }
        for kind, filters in inputs.items():
            response = await client.post(
                "/api/v1/ai/reason",
                json={
                    "kind": kind,
                    "question": f"Create a {kind} recommendation",
                    **filters,
                },
            )
            assert response.status_code == 200, response.text
            body = response.json()
            assert body["kind"] == kind
            assert body["grounded"] is True
            assert body["items"]
            assert all(item["evidence_ids"] for item in body["items"])


@pytest.mark.asyncio
async def test_graph_filters_do_not_require_text_search(monkeypatch):
    monkeypatch.setenv("NAN_ENVIRONMENT", "test")
    app = create_app()
    async with app.router.lifespan_context(app), make_client(app) as client:
        response = await client.get("/api/v1/graph/entities", params={"theme": "nature"})
        assert response.status_code == 200
        ids = {item["id"] for item in response.json()["items"]}
        assert "attraction-doi-phu-kha" in ids


@pytest.mark.asyncio
async def test_community_workflow(monkeypatch):
    monkeypatch.setenv("NAN_ENVIRONMENT", "test")
    app = create_app()
    async with app.router.lifespan_context(app), make_client(app) as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@nan.local", "password": "ChangeMe123!"},
        )
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        created = await client.post(
            "/api/v1/community/posts",
            headers=headers,
            json={
                "title": "Community memory",
                "body": "A sufficiently detailed community contribution.",
                "language": "en",
                "visibility": "community",
            },
        )
        assert created.status_code == 200
        post_id = created.json()["id"]
        submitted = await client.post(f"/api/v1/community/posts/{post_id}/submit", headers=headers)
        assert submitted.json()["status"] == "submitted"
        approved = await client.post(
            f"/api/v1/community/posts/{post_id}/moderate",
            headers=headers,
            json={"approve": True},
        )
        assert approved.json()["status"] == "approved"
