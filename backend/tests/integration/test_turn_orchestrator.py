from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.conversation.turn_orchestrator import TurnOrchestrator
from app.crm.lead_repository import LeadRepository
from app.models.business import Business
from app.models.conversation import Conversation, Message, MessageRole, Stage
from app.models.lead import LeadCategory
from app.models.visitor import Visitor
from app.voice.ws_manager import ConnectionManager
from tests.conftest import FakeLLMClient


class FakeKnowledgeProvider:
    async def get_context(self, db, business_id: int, query: str) -> str:
        return "[FAQ] Q: Do you help with visas? A: Yes."


async def _make_conversation(db: AsyncSession) -> tuple[Conversation, Business]:
    business = Business(
        slug="test-biz", name="Test Consultancy", industry="study_abroad",
        greeting_template="Hi, I'm Riya!", persona_description="You are Riya, a helpful consultant.",
    )
    db.add(business)
    await db.flush()

    visitor = Visitor(business_id=business.id, session_token="tok123")
    db.add(visitor)
    await db.flush()

    conversation = Conversation(visitor_id=visitor.id, business_id=business.id)
    db.add(conversation)
    await db.flush()

    return conversation, business


async def test_handle_turn_creates_lead_and_advances_stage(db_session: AsyncSession, fake_llm_client: FakeLLMClient):
    conversation, business = await _make_conversation(db_session)
    orchestrator = TurnOrchestrator(db_session, fake_llm_client, FakeKnowledgeProvider(), ConnectionManager())

    await orchestrator.handle_turn(
        conversation, business, "I want to study in Canada for a Master's in Computer Science."
    )

    lead = await LeadRepository(db_session).get_by_conversation_id(conversation.id)
    assert lead is not None
    assert lead.location == "Canada"
    assert lead.intent == "Master's in Computer Science"
    assert lead.lead_score == 65
    assert lead.category == LeadCategory.WARM  # 40 <= 65 < 70

    assert conversation.turn_count == 1
    # No budget/contact yet -> ladder stops at QUALIFICATION
    assert conversation.current_stage == Stage.QUALIFICATION

    history = await db_session.execute(select(Message))
    messages = history.scalars().all()
    assert len(messages) == 2
    assert {m.role for m in messages} == {MessageRole.USER, MessageRole.ASSISTANT}


async def test_handle_turn_survives_malformed_extraction_without_crashing(
    db_session: AsyncSession, fake_llm_client: FakeLLMClient
):
    fake_llm_client.extraction_json = "this is not json at all"
    conversation, business = await _make_conversation(db_session)
    orchestrator = TurnOrchestrator(db_session, fake_llm_client, FakeKnowledgeProvider(), ConnectionManager())

    await orchestrator.handle_turn(conversation, business, "Hello there")

    # Turn completes without raising; extraction failure is tracked...
    assert conversation.extraction_failure_count == 1
    # ...and the conversational reply path is unaffected regardless.
    assert conversation.turn_count == 1


async def test_reply_stream_never_touches_the_db_session(db_session: AsyncSession, fake_llm_client: FakeLLMClient):
    """Enforces the sole-writer contract: the reply-generation path takes no
    db handle at all, so it cannot write even if someone edits it carelessly.
    """
    import inspect

    from app.brain.reply_engine import generate_reply

    sig = inspect.signature(generate_reply)
    assert "db" not in sig.parameters
    assert "AsyncSession" not in str(sig)
