from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.api.routers import websocket as websocket_router

# Regression test: /ws/dashboard previously accepted a connection from ANY
# origin (or none at all) and fanned out every business's live lead
# updates — name/phone/email/budget — to it. This checks the same
# trusted-origin list the app-wide CORS middleware uses everywhere else.


def _make_client() -> TestClient:
    app = FastAPI()
    app.include_router(websocket_router.router)
    return TestClient(app)


def test_dashboard_ws_rejects_an_untrusted_origin():
    client = _make_client()
    try:
        with client.websocket_connect("/ws/dashboard", headers={"origin": "https://evil.example"}):
            raise AssertionError("connection should have been rejected")
    except WebSocketDisconnect as exc:
        assert exc.code == 4403


def test_dashboard_ws_accepts_a_trusted_origin():
    client = _make_client()
    with client.websocket_connect("/ws/dashboard", headers={"origin": "http://localhost:5173"}) as ws:
        ws.close()
