import enum

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class KnowledgeCategory(str, enum.Enum):
    FAQ = "faq"
    PRICING = "pricing"
    PRODUCT = "product"
    POLICY = "policy"


class KnowledgeItem(Base, TimestampMixin):
    """A flat business-knowledge row (FAQ/pricing/product/policy).

    MVP knowledge is flat rows concatenated into the system prompt by
    knowledge/static_knowledge_provider.py. A future RAG implementation can
    replace that provider without this model changing.
    """

    __tablename__ = "knowledge_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    category: Mapped[KnowledgeCategory] = mapped_column(Enum(KnowledgeCategory))
    question: Mapped[str | None] = mapped_column(String(300), nullable=True)
    content: Mapped[str] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    business: Mapped["Business"] = relationship(back_populates="knowledge_items")
