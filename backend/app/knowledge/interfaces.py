from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession


class KnowledgeProvider(Protocol):
    """The one seam between prompt-building and however business knowledge
    is actually retrieved. StaticKnowledgeProvider (flat-row concatenation,
    no external dependency) is wired in by default — see api/deps.py.
    RagKnowledgeProvider (backed by Qdrant, chunked/embedded retrieval) is
    the seam's real intended implementation once a vector store is
    provisioned for a given environment; swapping between them is a one-line
    change in deps.py, no caller changes.
    """

    async def get_context(self, db: AsyncSession, business_id: int, query: str) -> str:
        ...
