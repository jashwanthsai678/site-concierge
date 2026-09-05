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

import ipaddress
import logging
import socket
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


def _is_public_host(hostname: str) -> bool:
    """Rejects a hostname that resolves to a private/loopback/link-local/
    reserved address — called on every URL before fetching it, not just the
    caller-supplied starting URL, since a business's own site could
    otherwise link into internal infrastructure. Not a complete SSRF fix on
    its own: httpx's `follow_redirects=True` below doesn't re-run this
    check on each redirect hop, so a same-host page that redirects to an
    internal address after this check passes would still slip through — a
    production hardening pass should validate each hop, not just the
    request URL.
    """
    try:
        addr_info = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False
    for _family, _type, _proto, _canonname, sockaddr in addr_info:
        ip = ipaddress.ip_address(sockaddr[0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False
    return True


async def crawl_website(base_url: str, *, max_pages: int) -> list[CrawledPage]:
    """Breadth-first, same-domain crawl starting at `base_url`. Deliberately
    conservative (one request at a time, hard page cap, same-domain only,
    public-hosts-only, HTML-only) since this hits a real client's live
    site, not a sandbox.
    """
    base_host = urlparse(base_url).netloc
    if not _is_public_host(urlparse(base_url).hostname or ""):
        logger.warning("Refusing to crawl %s: resolves to a non-public address.", base_url)
        return []

    seen: set[str] = {base_url}
    queue: list[str] = [base_url]
    pages: list[CrawledPage] = []

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        while queue and len(pages) < max_pages:
            url = queue.pop(0)
            if not _is_public_host(urlparse(url).hostname or ""):
                logger.warning("Skipping %s during crawl: resolves to a non-public address.", url)
                continue
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
