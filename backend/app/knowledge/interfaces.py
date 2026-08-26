from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession


class KnowledgeProvider(Protocol):
    """The one seam between prompt-building and however business knowledge
    is actually retrieved. RagKnowledgeProvider (backed by Qdrant) is the
    current implementation; any other retrieval strategy can replace it
    without any caller changing.
    """

    async def get_context(self, db: AsyncSession, business_id: int, query: str) -> str:
        ...
