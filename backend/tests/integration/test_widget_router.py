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
    """The refusal now carries a CORS header on purpose (see the test below
    on why), so what this guards is the property that actually matters:
    a refused origin gets no business data, only the refusal itself.
    """
    await _seed_business(db_session)
    client = _make_client(db_session)

    response = client.get("/api/widget/widget-biz/config", headers={"Origin": UNREGISTERED_ORIGIN})

    assert response.status_code == 403
    assert "business" not in response.json()
    assert "widget-biz" not in response.text


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


async def test_preflight_succeeds_for_any_origin_but_the_real_request_still_refuses(
    db_session: AsyncSession,
):
    """Preflight used to 403 an unregistered origin. That looked stricter
    but was actively harmful: the browser then blocked the real call with
    an opaque "Failed to fetch", so the explanatory 403 never reached the
    widget and a misconfigured install gave the client no clue at all.

    A preflight is only permission to *send* the request, not permission to
    have the data. Enforcement belongs on the real call, which is the only
    place it can answer readably — so the preflight passes and the POST
    below is still refused.
    """
    await _seed_business(db_session)
    client = _make_client(db_session)

    preflight = client.options(
        "/api/widget/widget-biz/start",
        headers={
            "Origin": UNREGISTERED_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert preflight.status_code == 200
    assert preflight.headers["access-control-allow-origin"] == UNREGISTERED_ORIGIN

    actual = client.post("/api/widget/widget-biz/start", headers={"Origin": UNREGISTERED_ORIGIN})
    assert actual.status_code == 403
    assert "not registered" in actual.json()["detail"]


async def test_a_refused_origin_gets_a_cors_header_so_the_browser_can_read_why(db_session: AsyncSession):
    """The most common broken install is a correctly-pasted snippet on a
    domain nobody registered. Without CORS headers on the 403 the browser
    discards the response, so the widget could not report *why* it failed
    and the client saw nothing at all — just no widget.
    """
    await _seed_business(db_session)
    client = _make_client(db_session)

    response = client.get("/api/widget/widget-biz/config", headers={"Origin": UNREGISTERED_ORIGIN})

    assert response.status_code == 403
    assert response.headers.get("access-control-allow-origin") == UNREGISTERED_ORIGIN
    detail = response.json()["detail"]
    assert UNREGISTERED_ORIGIN in detail          # names the exact value to register
    assert "Allowed embed origins" in detail      # names where to put it


async def test_start_also_explains_a_refused_origin(db_session: AsyncSession):
    await _seed_business(db_session)
    client = _make_client(db_session)

    response = client.post("/api/widget/widget-biz/start", headers={"Origin": UNREGISTERED_ORIGIN})

    assert response.status_code == 403
    assert response.headers.get("access-control-allow-origin") == UNREGISTERED_ORIGIN
    assert UNREGISTERED_ORIGIN in response.json()["detail"]


async def test_an_origin_stored_with_a_trailing_slash_still_matches(db_session: AsyncSession):
    """Rows written before origins were canonicalised on save can carry a
    trailing slash, which never equals a browser's Origin header. Those
    must keep working rather than breaking invisibly."""
    business = Business(
        slug="legacy-biz", name="Legacy Biz", industry="services",
        greeting_template="Hi!", persona_description="You are helpful.",
        allowed_origins=["https://Legacy.example.com/"],
    )
    db_session.add(business)
    await db_session.flush()
    await db_session.commit()

    client = _make_client(db_session)
    response = client.get("/api/widget/legacy-biz/config", headers={"Origin": "https://legacy.example.com"})

    assert response.status_code == 200
