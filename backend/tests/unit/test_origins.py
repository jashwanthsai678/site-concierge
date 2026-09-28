import pytest

from app.utils.origins import InvalidOrigin, normalize_origin, normalize_origins, try_normalize_origin

# A browser's Origin header is always exactly scheme://host[:port]. Anything
# stored in the allowlist that doesn't match that form byte-for-byte can
# never match, which shows up not as a validation error but as a widget that
# silently never appears on the client's site.


@pytest.mark.parametrize(
    ("entered", "stored"),
    [
        ("https://example.com", "https://example.com"),
        ("https://example.com/", "https://example.com"),
        ("https://example.com/contact", "https://example.com"),
        ("https://example.com/contact?utm=x#top", "https://example.com"),
        ("HTTPS://Example.COM", "https://example.com"),
        ("  https://example.com  ", "https://example.com"),
        ("http://localhost:5176", "http://localhost:5176"),
        ("https://sub.example.co.uk:8443/path", "https://sub.example.co.uk:8443"),
    ],
)
def test_unambiguous_input_is_canonicalized(entered: str, stored: str):
    assert normalize_origin(entered) == stored


@pytest.mark.parametrize("entered", ["example.com", "www.example.com", "//example.com"])
def test_a_missing_scheme_is_refused_rather_than_guessed(entered: str):
    """http vs https can't be inferred, and guessing wrong produces exactly
    the silent failure this validation exists to prevent."""
    with pytest.raises(InvalidOrigin) as exc:
        normalize_origin(entered)
    assert "scheme" in str(exc.value)
    assert "https://" in str(exc.value)  # the message shows the fix


@pytest.mark.parametrize("entered", ["ftp://example.com", "javascript:alert(1)", "https://", "   "])
def test_unusable_values_are_refused(entered: str):
    with pytest.raises(InvalidOrigin):
        normalize_origin(entered)


def test_list_normalization_dedupes_and_keeps_order():
    assert normalize_origins(
        ["https://b.example.com", "https://a.example.com/", "  ", "https://A.example.com"],
    ) == ["https://b.example.com", "https://a.example.com"]


def test_try_normalize_returns_none_instead_of_raising():
    assert try_normalize_origin("example.com") is None
    assert try_normalize_origin("https://example.com/") == "https://example.com"
