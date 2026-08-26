"""Generic same-domain website crawler: fetches a client's real, live
website and returns extracted page text — one of the two ingestion-time
sources for RagKnowledgeProvider (see ingestion_service.py), alongside
client-provided KnowledgeItem rows. Runs once at onboarding/refresh time via
the standalone ingestion script, never per conversation turn.

Only fetches plain server-rendered HTML — a client-side-rendered SPA (like
this repo's own demo "company site") returns an empty shell to a plain HTTP
GET, so this cannot crawl that page; ingestion_service.py's demo run uses
seeded text standing in for it instead. A real client's marketing site is
typically server-rendered/static HTML, which this handles.
"""

import logging
from dataclasses import dataclass
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

_SKIP_TAGS = ("script", "style", "nav", "header", "footer", "noscript", "svg")
_SKIP_EXTENSIONS = (".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".css", ".js", ".zip", ".mp4", ".ico")


@dataclass(frozen=True)
class CrawledPage:
    url: str
    text: str


async def crawl_website(base_url: str, *, max_pages: int) -> list[CrawledPage]:
    """Breadth-first, same-domain crawl starting at `base_url`. Deliberately
    conservative (one request at a time, hard page cap, same-domain only,
    HTML-only) since this hits a real client's live site, not a sandbox.
    """
    base_host = urlparse(base_url).netloc
    seen: set[str] = {base_url}
    queue: list[str] = [base_url]
    pages: list[CrawledPage] = []

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        while queue and len(pages) < max_pages:
            url = queue.pop(0)
            try:
                response = await client.get(url)
                response.raise_for_status()
            except httpx.HTTPError as exc:
                logger.warning("Skipping %s during crawl: %s", url, exc)
                continue

            if "text/html" not in response.headers.get("content-type", ""):
                continue

            soup = BeautifulSoup(response.text, "html.parser")
            for tag in soup.find_all(_SKIP_TAGS):
                tag.decompose()
            text = " ".join(soup.get_text(" ").split())
            if text:
                pages.append(CrawledPage(url=url, text=text))

            for link in soup.find_all("a", href=True):
                next_url = urljoin(url, link["href"]).split("#")[0]
                if urlparse(next_url).netloc != base_host or next_url.lower().endswith(_SKIP_EXTENSIONS):
                    continue
                if next_url not in seen:
                    seen.add(next_url)
                    queue.append(next_url)

    return pages
