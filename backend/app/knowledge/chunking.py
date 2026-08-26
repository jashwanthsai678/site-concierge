def chunk_text(text: str, *, chunk_chars: int, overlap_chars: int) -> list[str]:
    """Splits `text` into overlapping character-window chunks. Paragraph
    breaks are collapsed first so a chunk boundary lands mid-paragraph only
    when a single paragraph itself exceeds `chunk_chars` — good enough for
    the short knowledge rows and page sections this ingests; not a
    sentence-aware splitter.
    """
    normalized = "\n\n".join(p.strip() for p in text.split("\n\n") if p.strip())
    if not normalized:
        return []
    if len(normalized) <= chunk_chars:
        return [normalized]

    chunks: list[str] = []
    start = 0
    while start < len(normalized):
        end = start + chunk_chars
        chunks.append(normalized[start:end])
        if end >= len(normalized):
            break
        start = end - overlap_chars
    return chunks
