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
    """MVP KnowledgeProvider: concatenates a business's flat FAQ/pricing/
    product rows into a single context string, truncated to a char budget
    so the 1.7B model's context stays small and generation stays fast.

    `query` is currently unused — the MVP doesn't do retrieval/ranking, it
    just includes everything for this (small) demo business. A future
    RagKnowledgeProvider would use `query` for similarity search; kept as a
    parameter now so callers never change when that swap happens.
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
