from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")

    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-20b"
    groq_request_timeout_seconds: float = 60.0

    database_url: str = f"sqlite+aiosqlite:///{BASE_DIR / 'ai_conversion_os.db'}"

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    conversation_idle_timeout_seconds: float = 90.0
    conversation_history_window: int = 8
    # A visitor's message has no size limit at the WebSocket protocol level
    # (ClientMessage.data is a bare dict) — without this, one oversized
    # utterance becomes an uncapped prompt sent to the LLM twice per turn
    # (reply + extraction), which is a real cost/abuse vector given the
    # product's near-zero-marginal-cost pricing model depends on bounded
    # per-turn token spend. 4000 chars is generously above anything a real
    # typed/spoken question needs.
    max_utterance_chars: int = 4000
    # BusinessSession tokens used to never expire at all — a leaked/stolen
    # token was valid forever until explicit logout. 30 days balances not
    # forcing an owner to re-login constantly against bounding how long a
    # leaked token stays useful.
    session_ttl_days: int = 30
    # Only used by StaticKnowledgeProvider (the active provider whenever
    # Qdrant isn't configured — see api/deps.py).
    knowledge_context_char_budget: int = 2000

    stage_prompts_path: Path = BASE_DIR / "app" / "config" / "stage_prompts.yaml"

    # RAG knowledge retrieval (Qdrant). Left blank until a collection is
    # provisioned — RagKnowledgeProvider degrades to no-context rather than
    # crashing a turn when unset/unreachable (see its docstring).
    qdrant_url: str = ""
    qdrant_api_key: str = ""
    qdrant_collection: str = "knowledge_chunks"
    # Runs locally via fastembed (no network hop per turn, no separate
    # embeddings provider/key) — only the vector index itself is hosted.
    rag_embedding_model: str = "BAAI/bge-small-en"
    rag_top_k: int = 6
    rag_chunk_chars: int = 800
    rag_chunk_overlap_chars: int = 100
    website_crawl_max_pages: int = 15

    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
