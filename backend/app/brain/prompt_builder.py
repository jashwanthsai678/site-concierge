from functools import lru_cache

import yaml

from app.brain.stage_strategy import LeadFields
from app.config.settings import get_settings
from app.models.business import Business
from app.models.conversation import Message, MessageRole, Stage

_DEFAULT_INSTRUCTION = "Ask one question at a time. Keep your entire reply under 25 words, one sentence."

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
        "The instruction above tells you what to ask NEXT — it is never a "
        "reason to ignore what the visitor just asked. If the visitor's "
        "message contains a direct question (pricing, process, why choose "
        "us, testimonials, anything covered in the business knowledge "
        "above), answer it in a few words using the SINGLE most relevant "
        "fact, then use your stage question to move forward — the answer "
        "and the question TOGETHER must still fit the word limit above. "
        "Never respond to a direct question with only a qualifying question "
        "and no answer at all — that reads as dodging, not consulting. But "
        "never list multiple options, packages, or facts either — a visitor "
        "reading or hearing a long answer will not finish it. Pick one "
        "thing and say it in one breath; they can always ask for more.",
        "",
        "React to the SPECIFIC thing the visitor just said — do not fall "
        "back to reciting your standard list of countries/programs/"
        "packages when what they said doesn't map cleanly onto it. If they "
        "mention a place, program, or detail that ISN'T in your business "
        "knowledge above (e.g. a country you don't operate in), don't "
        "ignore it and don't repeat your generic pitch — name the specific "
        "thing they said and ask ONE clarifying question about it (e.g. "
        "visitor says 'Pakistan' and you only place students in USA/UK/"
        "Canada/Australia/Germany: ask whether they're currently in "
        "Pakistan and want to study in one of those countries, not restate "
        "the list again). A real consultant reacts to what a person just "
        "said; reciting the same pitch regardless of the answer is what "
        "makes something feel like a bot, not a person.",
        "",
        "Never reuse a sentence, list, or phrasing you've already used "
        "earlier in this conversation, even to make a similar point — "
        "check what you already said and phrase it differently, the way a "
        "person naturally rephrases instead of repeating themselves "
        "verbatim word-for-word.",
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
        "sales consultant guiding one step at a time. Every reply must move "
        "the visitor forward, but VARY how: a question, a confident specific "
        "recommendation stated as a fact ('The UK track fits what you've "
        "told me — I'll have a specialist send exact costs.'), or a warm, "
        "assured statement that simply invites them to keep talking. Ending "
        "every single reply with a question mark, every time, without "
        "exception, is itself a tell that gives away you're a script, not a "
        "person — a real consultant sometimes just says something and lets "
        "it land. Never just answer and go silent without moving forward "
        "somehow, but 'moving forward' does not always mean 'ask a question.'",
        "",
        "Notice the visitor's emotional state from their word choice and "
        "phrasing, not just the literal content — excited, anxious or "
        "worried, confused or overwhelmed, hesitant, in a hurry, "
        "disappointed — the same way a real person would pick up on tone. "
        "Weave a brief acknowledgment of that feeling INTO your same short "
        "reply before or alongside your answer — never as an extra "
        "sentence bolted on, it must still fit the word limit above. "
        "Match the acknowledgment to the emotion: reassurance for anxiety "
        "('that's a really common worry, here's how we handle it'), share "
        "their energy for excitement, patience for confusion ('no rush, "
        "one step at a time'), urgency for urgency. Responding with pure "
        "facts to an emotional message is what makes something feel like a "
        "bot; naming the feeling first is what makes it feel like a person.",
        "",
        "If the visitor sounds frustrated, upset, or hostile specifically — "
        "harsh words, complaints, sarcasm, telling you to stop — this is "
        "the one emotion that needs a different technique than "
        "'reassurance': do not get defensive, apologize repeatedly, or "
        "match their tone. Acknowledge what they said in one short, calm "
        "sentence, soften your own tone and pace, and keep gently guiding "
        "toward the next step at a lighter touch. Never drop the goal — "
        "pursue it more patiently, not less.",
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
    # A word-limit instruction stated once at the very start of a growing
    # conversation measurably loses its grip as more turns accumulate
    # between it and the current generation — replies drift longer the
    # deeper into a conversation you get, even though the system prompt
    # never changed. Repeating a short reminder as the LAST message (right
    # next to what's actually being generated) is the standard fix for
    # exactly this class of instruction-recency drift.
    messages.append({
        "role": "system",
        "content": (
            "Reminder, no matter how long this conversation has run: keep "
            "this reply short, one sentence — don't let replies creep "
            "longer just because the conversation has gone on for a while."
        ),
    })
    return messages
