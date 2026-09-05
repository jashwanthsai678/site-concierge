import pytest

from app.knowledge.website_crawler import _is_public_host, crawl_website

# Regression coverage for the SSRF hardening added to the crawler: onboarding
# used to let any caller (see test_onboarding.py's now-removed vulnerable
# endpoints) point this at an arbitrary URL with zero validation.


@pytest.mark.parametrize(
    "hostname",
    ["127.0.0.1", "localhost", "10.0.0.5", "192.168.1.1", "169.254.169.254", "0.0.0.0"],
)
def test_rejects_private_loopback_and_link_local_hosts(hostname):
    assert _is_public_host(hostname) is False


def test_accepts_a_known_public_ip():
    # Google's public DNS — stable, well-known public address, avoids
    # depending on a real domain's DNS resolving in CI.
    assert _is_public_host("8.8.8.8") is True


def test_rejects_a_hostname_that_does_not_resolve():
    assert _is_public_host("this-domain-should-not-exist-12345.invalid") is False


async def test_crawl_website_refuses_a_private_ip_target_without_making_any_request():
    pages = await crawl_website("http://169.254.169.254/latest/meta-data/", max_pages=5)
    assert pages == []
