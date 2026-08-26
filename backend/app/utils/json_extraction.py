import json
import re

_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)


def extract_json_object(raw: str) -> dict | None:
    """Best-effort recovery of a JSON object from LLM text output.

    Small local models occasionally wrap valid JSON in markdown fences, or
    emit a JSON object embedded in surrounding prose despite instructions
    not to. Tries, in order: parse as-is, strip a markdown fence, brace-match
    the outermost `{...}` (not a naive regex — a naive regex breaks the
    moment a "summary" string itself contains braces).
    """
    raw = raw.strip()
    if not raw:
        return None

    for candidate in (raw, _strip_fence(raw)):
        if candidate is None:
            continue
        parsed = _try_parse(candidate)
        if parsed is not None:
            return parsed

    brace_matched = _find_outermost_braces(raw)
    if brace_matched is not None:
        return _try_parse(brace_matched)

    return None


def _strip_fence(raw: str) -> str | None:
    match = _FENCE_RE.search(raw)
    return match.group(1) if match else None


def _try_parse(candidate: str) -> dict | None:
    try:
        value = json.loads(candidate)
    except json.JSONDecodeError:
        return None
    return value if isinstance(value, dict) else None


def _find_outermost_braces(raw: str) -> str | None:
    start = raw.find("{")
    if start == -1:
        return None

    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(raw)):
        ch = raw[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return raw[start : i + 1]
    return None
