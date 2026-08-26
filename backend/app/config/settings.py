from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")

    token_router_base_url: str = "https://api.tokenrouter.com/v1"
    token_router_api_key: str = ""
    token_router_model: str = "qwen/qwen3.8-max-free"
    token_router_request_timeout_seconds: float = 60.0

    database_url: str = f"sqlite+aiosqlite:///{BASE_DIR / 'ai_conversion_os.db'}"

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    conversation_idle_timeout_seconds: float = 90.0
    conversation_history_window: int = 8

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
    rag_top_k: int = 4
    rag_chunk_chars: int = 800
    rag_chunk_overlap_chars: int = 100
    website_crawl_max_pages: int = 15

    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
