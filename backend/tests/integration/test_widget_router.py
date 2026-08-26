from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.api.routers import widget
from app.models.business import Business

REGISTERED_ORIGIN = "https://theirsite.com"
UNREGISTERED_ORIGIN = "https://evil.example"


def _make_client(db_session: AsyncSession) -> TestClient:
    app = FastAPI()
    app.include_router(widget.router)

    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    return TestClient(app)


async def _seed_business(db_session: AsyncSession) -> Business:
    business = Business(
        slug="widget-biz", name="Widget Biz", industry="services",
        greeting_template="Hi!", persona_description="You are helpful.",
        allowed_origins=[REGISTERED_ORIGIN],
    )
    db_session.add(business)
    await db_session.flush()
    await db_session.commit()
    return business


async def test_config_succeeds_for_registered_origin(db_session: AsyncSession):
    await _seed_business(db_session)
    client = _make_client(db_session)

    response = client.get("/api/widget/widget-biz/config", headers={"Origin": REGISTERED_ORIGIN})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == REGISTERED_ORIGIN
    assert response.json()["business"]["slug"] == "widget-biz"


async def test_config_rejects_unregistered_origin(db_session: AsyncSession):
    await _seed_business(db_session)
    client = _make_client(db_session)

    response = client.get("/api/widget/widget-biz/config", headers={"Origin": UNREGISTERED_ORIGIN})

    assert response.status_code == 403
    assert "access-control-allow-origin" not in response.headers


def test_config_404s_for_unknown_slug(db_session: AsyncSession):
    client = _make_client(db_session)
    response = client.get("/api/widget/no-such-biz/config", headers={"Origin": REGISTERED_ORIGIN})
    assert response.status_code == 404


async def test_start_creates_conversation_for_registered_origin(db_session: AsyncSession):
    await _seed_business(db_session)
    client = _make_client(db_session)

    response = client.post(
        "/api/widget/widget-biz/start",
        headers={"Origin": REGISTERED_ORIGIN, "Content-Type": "application/json"},
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == REGISTERED_ORIGIN
    assert response.json()["conversation_id"] is not None


async def test_start_rejects_unregistered_origin(db_session: AsyncSession):
    await _seed_business(db_session)
    client = _make_client(db_session)

    response = client.post(
        "/api/widget/widget-biz/start",
        headers={"Origin": UNREGISTERED_ORIGIN, "Content-Type": "application/json"},
    )

    assert response.status_code == 403


async def test_preflight_allows_registered_origin(db_session: AsyncSession):
    await _seed_business(db_session)
    client = _make_client(db_session)

    response = client.options(
        "/api/widget/widget-biz/start",
        headers={
            "Origin": REGISTERED_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == REGISTERED_ORIGIN


async def test_preflight_rejects_unregistered_origin(db_session: AsyncSession):
    await _seed_business(db_session)
    client = _make_client(db_session)

    response = client.options(
        "/api/widget/widget-biz/start",
        headers={
            "Origin": UNREGISTERED_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )

    assert response.status_code == 403
