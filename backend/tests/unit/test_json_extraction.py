from app.utils.json_extraction import extract_json_object


def test_parses_clean_json():
    assert extract_json_object('{"a": 1}') == {"a": 1}


def test_strips_markdown_fence():
    raw = '```json\n{"a": 1, "b": "two"}\n```'
    assert extract_json_object(raw) == {"a": 1, "b": "two"}


def test_recovers_json_embedded_in_prose():
    raw = 'Sure, here you go: {"a": 1} — hope that helps!'
    assert extract_json_object(raw) == {"a": 1}


def test_brace_matching_survives_nested_braces_in_string_values():
    raw = '{"summary": "the visitor said {hello} to us", "score": 5}'
    assert extract_json_object(raw) == {"summary": "the visitor said {hello} to us", "score": 5}


def test_returns_none_for_unrecoverable_garbage():
    assert extract_json_object("not json at all, sorry") is None


def test_returns_none_for_empty_string():
    assert extract_json_object("") is None
