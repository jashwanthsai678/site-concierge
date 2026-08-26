"""Thin wrapper around Qdrant's fastembed-integrated convenience API.
Embeddings run locally via `fastembed` (no network hop per turn, no
separate embeddings provider/key) — only the vector index itself is
hosted (Qdrant Cloud or self-hosted, via `qdrant_url`/`qdrant_api_key`).

`.add()`/`.query()` are the simplest correct "text in, text out" path for
this — `.add()` is flagged deprecated upstream in favor of wrapping text in
`models.Document` for `upsert`/`query_points`, but it remains functional
and is far less surface area to get right without a live cluster to
integration-test against, which is the right trade for this MVP.
"""

import logging

from qdrant_client import AsyncQdrantClient, models

from app.config.settings import Settings

logger = logging.getLogger(__name__)


class RagStore:
    def __init__(self, settings: Settings):
        self._collection = settings.qdrant_collection
        self._client = AsyncQdrantClient(
            url=settings.qdrant_url or None,
            api_key=settings.qdrant_api_key or None,
        )
        self._client.set_model(settings.rag_embedding_model)

    async def clear(self, *, business_id: int) -> None:
        """Deletes this business's existing chunks so re-running ingestion
        is idempotent instead of accumulating duplicates."""
        if not await self._client.collection_exists(self._collection):
            return
        await self._client.delete(self._collection, points_selector=self._business_filter(business_id))

    async def upsert(self, *, business_id: int, chunks: list[str], metadatas: list[dict]) -> None:
        if not chunks:
            return
        payloads = [{"business_id": business_id, **metadata} for metadata in metadatas]
        await self._client.add(self._collection, documents=chunks, metadata=payloads)

    async def search(self, *, business_id: int, query: str, top_k: int) -> list[dict]:
        if not await self._client.collection_exists(self._collection):
            return []
        results = await self._client.query(
            self._collection, query_text=query, query_filter=self._business_filter(business_id), limit=top_k,
        )
        return [{"text": r.document, "score": r.score, **r.metadata} for r in results]

    @staticmethod
    def _business_filter(business_id: int) -> models.Filter:
        return models.Filter(
            must=[models.FieldCondition(key="business_id", match=models.MatchValue(value=business_id))]
        )
