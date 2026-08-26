"""One-time (or re-run-on-refresh) ingestion into the RAG vector store:
chunks + embeds a business's client-provided KnowledgeItem rows AND its
website content, then upserts into Qdrant scoped by business_id.

Run standalone — `python -m app.knowledge.ingestion_service [--website-url
URL]` — NOT wired into main.py's startup lifespan, since Qdrant credentials
aren't required for the rest of the app to run.

The demo business's own "website" (frontend/src/pages/CompanyWebsitePage.tsx)
is a client-side-rendered SPA — a plain HTTP crawl of it returns only the
empty shell (see website_crawler.py's docstring), so DEMO_WEBSITE_COPY below
stands in for what crawling a real, server-rendered client site would
produce. Pass --website-url to exercise the real crawler against an actual
live site instead.
"""

import argparse
import asyncio
import logging

from sqlalchemy import select

from app.config.settings import get_settings
from app.database.seed import DEMO_BUSINESS_SLUG
from app.database.session import async_session_factory
from app.knowledge.chunking import chunk_text
from app.knowledge.rag_store import RagStore
from app.knowledge.website_crawler import crawl_website
from app.models.business import Business
from app.models.knowledge import KnowledgeItem

logger = logging.getLogger(__name__)

DEMO_WEBSITE_COPY = [
    ("stats", "Horizon Overseas Education has placed 500+ students across 15+ partner countries, "
              "with a 98% visa success rate and over 12 years of experience."),
    ("destinations", "Popular study destinations: USA offers STEM & Business Master's with strong OPT "
                      "pathways. UK offers 1-year Master's programs with fast return on investment. "
                      "Canada offers PR-friendly programs with co-op work terms. Australia offers "
                      "January & July intakes with a post-study work visa."),
    ("process", "How it works: 1) Free Consultation - share your goals, budget, and background with a "
                "counselor. 2) Shortlisting - we match you to universities that fit your profile and "
                "budget. 3) Application & Documentation - we handle forms, SOPs, and recommendation "
                "letters end-to-end. 4) Visa Filing - complete visa documentation plus mock interview "
                "preparation. 5) Fly & Settle - pre-departure briefing and support once you land."),
    ("why-us", "Why choose Horizon Overseas Education: end-to-end visa filing and mock interview prep; "
               "merit & need-based scholarship guidance at no extra cost; shortlisting to offer letter "
               "in as little as 8 weeks; dedicated regional counselors for every destination."),
    ("testimonials", "Student testimonials: Ananya R. says Horizon handled her entire Canada application "
                      "and she didn't have to chase anything herself. Rohit K. says he got a partial "
                      "scholarship he didn't even know he was eligible for."),
]


def _chunk_all(pairs: list[tuple[str, str]], *, chunk_chars: int, overlap_chars: int) -> list[tuple[str, str]]:
    """`pairs` is (label, text); returns (label, chunk) for every chunk of every text."""
    out: list[tuple[str, str]] = []
    for label, text in pairs:
        for chunk in chunk_text(text, chunk_chars=chunk_chars, overlap_chars=overlap_chars):
            out.append((label, chunk))
    return out


async def ingest_business(business_id: int, *, website_url: str | None = None) -> int:
    settings = get_settings()
    store = RagStore(settings)
    await store.clear(business_id=business_id)

    async with async_session_factory() as db:
        items = (
            await db.execute(select(KnowledgeItem).where(KnowledgeItem.business_id == business_id))
        ).scalars().all()

    client_pairs = [
        (item.category.value, f"{item.question}: {item.content}" if item.question else item.content)
        for item in items
    ]
    client_chunks = _chunk_all(
        client_pairs, chunk_chars=settings.rag_chunk_chars, overlap_chars=settings.rag_chunk_overlap_chars,
    )

    if website_url:
        pages = await crawl_website(website_url, max_pages=settings.website_crawl_max_pages)
        website_pairs = [(page.url, page.text) for page in pages]
    else:
        website_pairs = DEMO_WEBSITE_COPY
    website_chunks = _chunk_all(
        website_pairs, chunk_chars=settings.rag_chunk_chars, overlap_chars=settings.rag_chunk_overlap_chars,
    )

    chunks = [text for _label, text in client_chunks] + [text for _label, text in website_chunks]
    metadatas = (
        [{"source": "client_provided", "category": label} for label, _text in client_chunks]
        + [
            {"source": "website", **({"url": label} if website_url else {"section": label})}
            for label, _text in website_chunks
        ]
    )

    await store.upsert(business_id=business_id, chunks=chunks, metadatas=metadatas)
    logger.info("Ingested %d chunks for business_id=%d", len(chunks), business_id)
    return len(chunks)


async def _main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--website-url", default=None,
        help="Crawl a real live site instead of the demo's seeded website copy.",
    )
    args = parser.parse_args()

    async with async_session_factory() as db:
        business = await db.scalar(select(Business).where(Business.slug == DEMO_BUSINESS_SLUG))
    if business is None:
        raise SystemExit(f"Demo business '{DEMO_BUSINESS_SLUG}' not found — run `python -m app.database.seed` first.")

    await ingest_business(business.id, website_url=args.website_url)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(_main())
