import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.deps import get_llm_client
from app.api.routers import analytics, auth, conversations, health, leads, onboarding, pages, portal, websocket, widget
from app.api.scoped_cors import ScopedCorsMiddleware
from app.brain.warmup import warm_up
from app.config.settings import get_settings
from app.database import seed as seed_module

logging.basicConfig(level=get_settings().log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await seed_module.seed()
    await warm_up(get_llm_client())
    yield


app = FastAPI(title="Qualeadio", lifespan=lifespan)

# Uploaded mascot images (see api/routers/portal.py's mascot-image
# endpoints) — served as plain static files. Cross-origin <img src="...">
# loading isn't subject to CORS at all (unlike fetch/canvas access), so no
# CORS handling is needed here even for widgets embedded on external sites.
_UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_UPLOADS_DIR)), name="uploads")

settings = get_settings()
app.add_middleware(
    ScopedCorsMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(websocket.router)
app.include_router(pages.router)
app.include_router(leads.router)
app.include_router(analytics.router)
app.include_router(conversations.router)
app.include_router(onboarding.router)
app.include_router(widget.router)
app.include_router(auth.router)
app.include_router(portal.router)
