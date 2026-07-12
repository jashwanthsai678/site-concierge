from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession


class KnowledgeProvider(Protocol):
    """The one seam between prompt-building and however business knowledge
    is actually retrieved. The MVP implementation (StaticKnowledgeProvider)
    concatenates flat rows; a future RAG implementation can replace it
    without any caller changing — hence `async` even though the static
    implementation doesn't strictly need it: the future implementation will
    (it awaits an embedding/similarity search call), and matching the
    signature now means only DI wiring changes later, not call sites.
    """

    async def get_context(self, db: AsyncSession, business_id: int, query: str) -> str:
        ...
