from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.scoped_cors import ScopedCorsMiddleware

_APP_ORIGIN = "http://localhost:5173"


def _make_app() -> FastAPI:
    app = FastAPI()

    @app.get("/api/widget/whatever")
    def widget_route():
        return {"ok": True}

    @app.options("/api/widget/whatever")
    def widget_preflight():
        # Deliberately a trivial stand-in for the real per-business check in
        # api/routers/widget.py — what's under test here is only whether
        # this handler gets REACHED at all, not its own logic.
        return {"handled_by": "route"}

    @app.get("/api/leads")
    def leads_route():
        return {"leads": []}

    app.add_middleware(
        ScopedCorsMiddleware,
        allow_origins=[_APP_ORIGIN],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    return app


def test_widget_preflight_reaches_the_route_handler_not_the_static_middleware():
    """The whole point of ScopedCorsMiddleware: without it, Starlette's
    CORSMiddleware answers every preflight itself and never calls the app —
    a foreign (but business-registered) origin would always get rejected
    here, since it's not in the app's static allow_origins.
    """
    client = TestClient(_make_app())
    response = client.options(
        "/api/widget/whatever",
        headers={
            "Origin": "https://some-clients-real-site.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.json() == {"handled_by": "route"}


def test_non_widget_path_still_enforces_the_static_origin_allowlist():
    client = TestClient(_make_app())

    allowed = client.get("/api/leads", headers={"Origin": _APP_ORIGIN})
    assert allowed.headers.get("access-control-allow-origin") == _APP_ORIGIN

    foreign = client.get("/api/leads", headers={"Origin": "https://unrelated.example"})
    assert "access-control-allow-origin" not in foreign.headers
