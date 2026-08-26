"""Idempotent demo data seed: one business (a study-abroad consultancy),
its knowledge base, and one campaign that the ad simulator links to.

Run standalone with `python -m app.database.seed`, or imported and awaited
from main.py's lifespan on startup.
"""

import asyncio
import logging

from sqlalchemy import select

from app.database.engine import create_all_tables
from app.database.session import async_session_factory
from app.models.business import Business
from app.models.campaign import Campaign
from app.models.knowledge import KnowledgeCategory, KnowledgeItem

logger = logging.getLogger(__name__)

DEMO_BUSINESS_SLUG = "horizon-overseas-education"
DEMO_CAMPAIGN_SLUG = "study-abroad-meta"

FAQS = [
    ("Which countries do you help students apply to?", "We place students in the USA, UK, Canada, Australia, and Germany, with dedicated counselors for each region."),
    ("Do you help with student visas?", "Yes — visa filing, mock interviews, and financial documentation are included in every package."),
    ("How long does the application process take?", "Most students complete shortlisting to offer letter in 8-12 weeks, depending on intake and country."),
    ("Do you help with scholarships?", "We identify merit and need-based scholarships during counseling and assist with scholarship essays at no extra cost."),
    ("What if I don't have IELTS/TOEFL yet?", "We offer a partnered test-prep track and can still start university shortlisting in parallel."),
]

PRICING = [
    ("Counseling & Application Package", "Full-service counseling, shortlisting, and application filing for up to 6 universities: INR 45,000, one-time."),
    ("Visa Filing Add-on", "End-to-end visa documentation and mock interview prep: INR 15,000."),
]

PRODUCTS = [
    ("Popular destinations", "USA (STEM & Business), UK (1-year Master's), Canada (PR-friendly programs), Australia (Jan/Jul intakes)."),
]


async def seed() -> None:
    await create_all_tables()

    async with async_session_factory() as db:
        existing = await db.scalar(select(Business).where(Business.slug == DEMO_BUSINESS_SLUG))
        if existing:
            logger.info("Seed skipped: demo business already exists (id=%s)", existing.id)
            return

        business = Business(
            slug=DEMO_BUSINESS_SLUG,
            name="Horizon Overseas Education",
            industry="study_abroad",
            # Spoken once the visitor has actually engaged with the site
            # (see frontend's useEngagementTracker) or clicked the widget
            # themselves — framed as a proactive check-in, not a cold-open
            # popup greeting.
            greeting_template=(
                "Hi, I'm Riya from Horizon Overseas Education. I noticed you've been "
                "looking around — happy to answer any questions about studying abroad, "
                "or help you figure out what fits best for you."
            ),
            persona_description=(
                "You are Riya, an experienced, warm, and consultative study-abroad "
                "counselor at Horizon Overseas Education. You are NOT a chatbot — you "
                "sound like a real senior consultant who has helped hundreds of students, "
                "and you are actively selling: your job is to convert this conversation "
                "into a booked call with a specialist, not just to answer questions. "
                "You guide the conversation, ask one question at a time, and after every "
                "answer you give, you look for a natural way to move the visitor one step "
                "closer to booking — you never just answer and stop."
            ),
            branding_color="#2a78d6",
        )
        db.add(business)
        await db.flush()

        order = 0
        for question, answer in FAQS:
            db.add(KnowledgeItem(
                business_id=business.id, category=KnowledgeCategory.FAQ,
                question=question, content=answer, display_order=order,
            ))
            order += 1
        for title, content in PRICING:
            db.add(KnowledgeItem(
                business_id=business.id, category=KnowledgeCategory.PRICING,
                question=title, content=content, display_order=order,
            ))
            order += 1
        for title, content in PRODUCTS:
            db.add(KnowledgeItem(
                business_id=business.id, category=KnowledgeCategory.PRODUCT,
                question=title, content=content, display_order=order,
            ))
            order += 1

        db.add(Campaign(
            business_id=business.id,
            name="Study Abroad — Meta Lead Gen Demo",
            utm_source="meta",
            utm_campaign="study-abroad-2026",
            landing_page_slug=DEMO_CAMPAIGN_SLUG,
            ad_creative_headline="Studying abroad in 2026? Talk to a real counselor right now.",
            ad_creative_body=(
                "Get instant, personalized guidance on universities, visas, and scholarships — "
                "no forms, just a quick conversation."
            ),
        ))

        await db.commit()
        logger.info("Seeded demo business '%s' with campaign '%s'", business.name, DEMO_CAMPAIGN_SLUG)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed())
