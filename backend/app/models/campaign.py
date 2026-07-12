from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Campaign(Base, TimestampMixin):
    """Simulates an ad campaign (e.g. a Meta ad) that drives traffic to a
    branded landing page. `landing_page_slug` is what `/l/:slug` resolves.
    """

    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    utm_source: Mapped[str] = mapped_column(String(80))
    utm_campaign: Mapped[str] = mapped_column(String(120))
    landing_page_slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    ad_creative_headline: Mapped[str] = mapped_column(String(300))
    ad_creative_body: Mapped[str] = mapped_column(String(500))

    business: Mapped["Business"] = relationship(back_populates="campaigns")
