from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.websockets import WebSocketDisconnect

from app.api.deps import get_db
from app.api.routers import websocket as websocket_router
from app.models.business import Business
from app.models.business_session import BusinessSession
from app.models.base import utcnow
from app.utils.security import hash_password
from datetime import timedelta

# /ws/dashboard fans out live lead updates — name, phone, email, budget.
# It has two independent gates and both matter: the origin check stops an
# arbitrary site from opening the socket, and the session token decides
# WHOSE leads the connection receives. Origin alone was not enough, because
# a logged-in client's own browser is already on a trusted origin.

TRUSTED_ORIGIN = "http://localhost:5173"


class _SessionFactoryStub:
    """The WS handler opens its own short-lived session via
    `async_session_factory()` rather than holding a DB session open for the
    entire life of the socket (which could be hours), so it can't be
    redirected with `dependency_overrides`. This stands in for the factory
    and hands back the test's session without closing it on exit.
    """

    def __init__(self, session: AsyncSession):
        self._session = session

    def __call__(self) -> "_SessionFactoryStub":
        return self

    async def __aenter__(self) -> AsyncSession:
        return self._session

    async def __aexit__(self, *exc_info) -> bool:
        return False


def _make_client(db_session: AsyncSession | None = None, monkeypatch=None) -> TestClient:
    app = FastAPI()
    app.include_router(websocket_router.router)
    if db_session is not None:
        async def _override_get_db():
            yield db_session

        app.dependency_overrides[get_db] = _override_get_db
        monkeypatch.setattr(websocket_router, "async_session_factory", _SessionFactoryStub(db_session))
    return TestClient(app)


async def _seed_session(db_session: AsyncSession, *, expired: bool = False) -> str:
    business = Business(
        slug="ws-dash-biz",
        email="owner@ws-dash.example",
        hashed_password=hash_password("correct-horse-battery-staple"),
        name="WS Dash Biz",
        industry="services",
        greeting_template="Hi!",
        persona_description="You are helpful.",
    )
    db_session.add(business)
    await db_session.flush()

    delta = timedelta(days=-1) if expired else timedelta(days=30)
    session = BusinessSession(business_id=business.id, token="ws-dash-token", expires_at=utcnow() + delta)
    db_session.add(session)
    await db_session.flush()
    await db_session.commit()
    return session.token


def test_dashboard_ws_rejects_an_untrusted_origin():
    client = _make_client()
    try:
        with client.websocket_connect("/ws/dashboard?token=anything", headers={"origin": "https://evil.example"}):
            raise AssertionError("connection should have been rejected")
    except WebSocketDisconnect as exc:
        assert exc.code == 4403


def test_dashboard_ws_rejects_a_missing_token():
    """Regression: a trusted origin alone used to be enough, which meant any
    page on this app's own origin could subscribe to every business's leads.
    """
    client = _make_client()
    try:
        with client.websocket_connect("/ws/dashboard", headers={"origin": TRUSTED_ORIGIN}):
            raise AssertionError("connection should have been rejected")
    except WebSocketDisconnect as exc:
        assert exc.code == 4401


async def test_dashboard_ws_rejects_an_unknown_token(db_session: AsyncSession, monkeypatch):
    client = _make_client(db_session, monkeypatch)
    try:
        with client.websocket_connect("/ws/dashboard?token=not-a-real-token", headers={"origin": TRUSTED_ORIGIN}):
            raise AssertionError("connection should have been rejected")
    except WebSocketDisconnect as exc:
        assert exc.code == 4401


async def test_dashboard_ws_rejects_an_expired_token(db_session: AsyncSession, monkeypatch):
    token = await _seed_session(db_session, expired=True)
    client = _make_client(db_session, monkeypatch)
    try:
        with client.websocket_connect(f"/ws/dashboard?token={token}", headers={"origin": TRUSTED_ORIGIN}):
            raise AssertionError("connection should have been rejected")
    except WebSocketDisconnect as exc:
        assert exc.code == 4401


async def test_dashboard_ws_accepts_a_trusted_origin_with_a_valid_token(db_session: AsyncSession, monkeypatch):
    token = await _seed_session(db_session)
    client = _make_client(db_session, monkeypatch)
    with client.websocket_connect(f"/ws/dashboard?token={token}", headers={"origin": TRUSTED_ORIGIN}) as ws:
        ws.close()
