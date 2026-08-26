from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import get_settings
from app.models.knowledge import KnowledgeCategory, KnowledgeItem

_CATEGORY_LABEL = {
    KnowledgeCategory.FAQ: "FAQ",
    KnowledgeCategory.PRICING: "Pricing",
    KnowledgeCategory.PRODUCT: "Product",
    KnowledgeCategory.POLICY: "Policy",
}


class StaticKnowledgeProvider:
    """No-Qdrant-dependency KnowledgeProvider: concatenates a business's
    flat FAQ/pricing/product rows into a single context string, truncated
    to a char budget. Wired in as the active provider (see api/deps.py)
    whenever Qdrant isn't provisioned for the environment in question —
    RagKnowledgeProvider (knowledge/rag_knowledge_provider.py) is still the
    real implementation for onboarded businesses with RAG configured; this
    one just avoids a wasted connection attempt + log noise on every turn
    when there's no vector store to reach at all.

    `query` is unused — no retrieval/ranking here, it just includes
    everything for whatever small knowledge base is configured.
    """

    async def get_context(self, db: AsyncSession, business_id: int, query: str) -> str:
        result = await db.execute(
            select(KnowledgeItem)
            .where(KnowledgeItem.business_id == business_id)
            .order_by(KnowledgeItem.display_order)
        )
        items = result.scalars().all()

        lines: list[str] = []
        for item in items:
            label = _CATEGORY_LABEL[item.category]
            if item.question:
                lines.append(f"[{label}] Q: {item.question} A: {item.content}")
            else:
                lines.append(f"[{label}] {item.content}")

        context = "\n".join(lines)
        budget = get_settings().knowledge_context_char_budget
        if len(context) > budget:
            context = context[:budget] + "\n[...knowledge truncated...]"
        return context
