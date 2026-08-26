from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Business(Base, TimestampMixin):
    """A tenant business configured to run an AI voice sales rep.

    Single row for the MVP demo, but modeled as a first-class entity (rather
    than hardcoded) so a second demo business costs a seed row, not a
    migration.
    """

    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    industry: Mapped[str] = mapped_column(String(80))
    greeting_template: Mapped[str] = mapped_column(String(500))
    persona_description: Mapped[str] = mapped_column(String(1000))
    branding_color: Mapped[str] = mapped_column(String(20), default="#2a78d6")
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)

    knowledge_items: Mapped[list["KnowledgeItem"]] = relationship(back_populates="business")
    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="business")
