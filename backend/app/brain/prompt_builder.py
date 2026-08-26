from functools import lru_cache

import yaml

from app.brain.stage_strategy import LeadFields
from app.config.settings import get_settings
from app.models.business import Business
from app.models.conversation import Message, MessageRole, Stage

_DEFAULT_INSTRUCTION = "Ask one question at a time and keep your reply under 40 words."

_ROLE_MAP = {
    MessageRole.USER: "user",
    MessageRole.ASSISTANT: "assistant",
}

_FIELD_LABELS: list[tuple[str, str]] = [
    ("name", "Name"),
    ("phone", "Phone"),
    ("email", "Email"),
    ("location", "Destination/location interest"),
    ("intent", "Program/interest"),
    ("budget", "Budget"),
]


@lru_cache
def _load_stage_prompts() -> dict[str, str]:
    path = get_settings().stage_prompts_path
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def _known_fields_block(fields: LeadFields) -> str:
    """Renders a plain fact sheet of what's already been captured. Small
    local models are unreliable at *inferring* this from re-reading the raw
    transcript on their own — spelling it out explicitly is what actually
    stops them from re-asking a question the visitor already answered.
    """
    known = [f"- {label}: {value}" for attr, label in _FIELD_LABELS if (value := getattr(fields, attr))]
    if not known:
        return "Nothing about the visitor is confirmed yet."
    return "\n".join(known)


def build_system_prompt(business: Business, stage: Stage, knowledge_context: str, known_fields: LeadFields) -> str:
    stage_instruction = _load_stage_prompts().get(stage.value, _DEFAULT_INSTRUCTION)

    parts = [
        business.persona_description,
        "",
        "Business knowledge you can use (do not invent facts beyond this):",
        knowledge_context or "(no additional knowledge configured)",
        "",
        "What you already know about this visitor (confirmed from earlier in "
        "this conversation):",
        _known_fields_block(known_fields),
        "Do NOT ask again for anything already listed above. If everything "
        "relevant to the current step is already known, move the "
        "conversation forward instead of repeating a question.",
        "",
        stage_instruction.strip(),
        "",
        "If the visitor asks for or you choose to reply in any language other "
        "than English, write it phonetically using plain English/Latin "
        "letters only (the way people text that language on a phone, e.g. "
        "'meeku emi kavali' for Telugu) — never native script (e.g. never "
        "Devanagari, Telugu, Tamil script, etc). This is a hard technical "
        "requirement: the voice reading your reply aloud can only pronounce "
        "Latin letters and will produce no sound at all for native script.",
        "",
        "Never behave like a generic AI assistant. Never dump multiple pieces "
        "of information at once. Never repeat a question you've already "
        "asked in this conversation. Always sound like a real, experienced "
        "sales consultant guiding one step at a time. Every reply must end "
        "by moving the visitor forward — a qualifying question, a specific "
        "recommendation, or a nudge toward booking a call. Never just "
        "answer and stop without steering toward the next step.",
        "",
        "If the visitor sounds frustrated, upset, or hostile — harsh words, "
        "complaints, sarcasm, telling you to stop — do not get defensive, "
        "apologize repeatedly, or match their tone. Acknowledge what they "
        "said in one short, calm sentence, soften your own tone and pace, "
        "and keep gently guiding toward the next step at a lighter touch. "
        "Never drop the goal — pursue it more patiently, not less.",
        "",
        "Every question you ask should be grounded in the specific business "
        "knowledge above — name an actual program, destination, or package "
        "rather than asking something generic like 'what are you looking "
        "for.' A specific question ('Are you leaning toward Canada or the "
        "UK?') sounds like a consultant who knows this business; a generic "
        "one ('what are your needs?') sounds like a form.",
    ]
    return "\n".join(parts)


def build_messages(
    *,
    business: Business,
    stage: Stage,
    knowledge_context: str,
    known_fields: LeadFields,
    history: list[Message],
    utterance: str,
) -> list[dict]:
    """Assembles the /api/chat `messages` array: system prompt (persona +
    knowledge + known-fields fact sheet + stage instruction) + windowed
    prior turns + this turn.

    History is windowed by the caller (conversation_service) to the last N
    messages — a 1.7B model's effective attention to distant context
    degrades anyway, and unbounded history would blow the latency budget.
    """
    messages: list[dict] = [
        {"role": "system", "content": build_system_prompt(business, stage, knowledge_context, known_fields)},
    ]
    for m in history:
        messages.append({"role": _ROLE_MAP[m.role], "content": m.content})
    messages.append({"role": "user", "content": utterance})
    return messages
