from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")

    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "qwen3:1.7b"
    ollama_keep_alive: str = "30m"
    # Generous: an empirically observed COLD load of qwen3:1.7b took ~8.4s
    # before generation even starts. Warm calls are ~3s for a short reply.
    ollama_request_timeout_seconds: float = 60.0

    database_url: str = f"sqlite+aiosqlite:///{BASE_DIR / 'ai_conversion_os.db'}"

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    conversation_idle_timeout_seconds: float = 90.0
    conversation_history_window: int = 8
    knowledge_context_char_budget: int = 2000

    stage_prompts_path: Path = BASE_DIR / "app" / "config" / "stage_prompts.yaml"

    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
