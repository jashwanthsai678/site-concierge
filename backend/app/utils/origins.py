"""Canonicalising the embed origins a client types into the portal.

A browser's `Origin` header is always exactly `scheme://host[:port]` — never
a path, never a trailing slash, host lower-cased. An allowlist entry that
doesn't match that form byte-for-byte can never match anything, so a typo
here isn't a validation nicety: it's an install that silently never works,
with no error anywhere the client can see.

So: normalise what is unambiguous (strip the path, the trailing slash,
case), and reject what is ambiguous with a message written to be shown to
the person who typed it. Guessing a missing scheme would be worse than
refusing — `http` vs `https` is not recoverable by inspection, and a wrong
guess produces exactly the silent failure this is meant to prevent.
"""

from urllib.parse import urlparse


class InvalidOrigin(ValueError):
    """Carries a message intended for the client, not just for logs."""


def normalize_origin(value: str) -> str:
    candidate = value.strip()
    if not candidate:
        raise InvalidOrigin("Blank origin.")

    parsed = urlparse(candidate)

    if not parsed.scheme:
        bare = candidate.lstrip("/")
        raise InvalidOrigin(
            f'"{candidate}" needs a scheme — write it as "https://{bare}" '
            f'(or "http://{bare}" if the site is not on HTTPS).'
        )
    if parsed.scheme not in ("http", "https"):
        raise InvalidOrigin(f'"{candidate}" must start with http:// or https://.')
    if not parsed.netloc:
        raise InvalidOrigin(f'"{candidate}" is missing a domain name.')

    return f"{parsed.scheme}://{parsed.netloc.lower()}"


def try_normalize_origin(value: str) -> str | None:
    """Non-raising variant, for comparing against values already stored —
    rows saved before this normalisation existed may not be canonical."""
    try:
        return normalize_origin(value)
    except InvalidOrigin:
        return None


def normalize_origins(values: list[str]) -> list[str]:
    """Normalises a whole list, dropping blanks and de-duplicating while
    preserving the order the client entered them in."""
    seen: dict[str, None] = {}
    for value in values:
        if not value.strip():
            continue
        seen.setdefault(normalize_origin(value), None)
    return list(seen)
