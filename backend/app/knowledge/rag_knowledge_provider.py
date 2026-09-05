"""RAG KnowledgeProvider: retrieves the top-K chunks most relevant to THIS
visitor's utterance (from client-provided KnowledgeItem rows AND crawled
website pages, both ingested ahead of time by ingestion_service.py) instead
of StaticKnowledgeProvider's "concatenate every row" approach — the swap
seam `knowledge/interfaces.py` and `api/deps.py` were already reserving.

Falls back to no-context on any retrieval failure (Qdrant unreachable,
collection not yet provisioned) rather than raising — a vector-store outage
should degrade the reply, not crash the visitor's turn.
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import get_settings
from app.knowledge.rag_store import RagStore

logger = logging.getLogger(__name__)

_NO_CONTEXT = "(no additional knowledge configured)"


class RagKnowledgeProvider:
    def __init__(self, store: RagStore | None = None):
        self._store = store or RagStore(get_settings())

    async def get_context(self, _db: AsyncSession, business_id: int, query: str) -> str:
        try:
            results = await self._store.search(business_id=business_id, query=query, top_k=get_settings().rag_top_k)
        except Exception:
            logger.exception("RAG retrieval failed; continuing without knowledge context.")
            return _NO_CONTEXT

        if not results:
            return _NO_CONTEXT

        # Qdrant already returns `results` ranked best-match-first — capping
        # by accumulating in that order (stopping once the budget is hit,
        # rather than joining everything then hard-truncating the string)
        # means a low-relevance chunk is what gets dropped when a business
        # has enough content to exceed the budget, never a high-relevance
        # one cut off mid-sentence. This budget also bounds how many tokens
        # a single turn's reply-generation call spends on knowledge context
        # at all — with no cap here, `rag_top_k` chunks at up to
        # `rag_chunk_chars` each could grow the prompt enough on its own to
        # meaningfully eat into a low free-tier tokens-per-minute ceiling.
        budget = get_settings().knowledge_context_char_budget
        lines: list[str] = []
        used = 0
        for result in results:
            source = result.get("source", "knowledge")
            location = f" ({result['url']})" if result.get("url") else ""
            line = f"[{source}]{location} {result['text']}"
            if used + len(line) > budget and lines:
                break
            lines.append(line)
            used += len(line)
        return "\n".join(lines)
