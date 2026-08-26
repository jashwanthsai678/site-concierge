import re

_SENTENCE_END_RE = re.compile(r"[.!?](?:\s|$)")


def split_first_sentence(buffer: str) -> tuple[str, str] | None:
    """Finds the first sentence-ending punctuation in `buffer` and splits
    there. Returns `(sentence, remainder)` or `None` if no boundary yet.

    Used to flush streamed LLM tokens to the client at sentence granularity
    (not per-token) — this is both what the frontend needs to speak
    sentence-by-sentence via the browser's TTS, and avoids per-token
    WebSocket message overhead for a ~28 tok/s model.
    """
    match = _SENTENCE_END_RE.search(buffer)
    if match is None:
        return None
    split_at = match.end()
    return buffer[:split_at], buffer[split_at:]
