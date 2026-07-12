import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.deps import get_llm_client
from app.api.routers import analytics, conversations, health, leads, pages, websocket
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


app = FastAPI(title="Site Concierge", lifespan=lifespan)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
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
