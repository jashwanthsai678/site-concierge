from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.lead_repository import LeadRepository
from app.crm.scoring import categorize
from app.models.lead import Lead
from app.schemas.lead_extraction import LeadExtraction


class LeadService:
    """Applies an LLM extraction result onto a Lead row.

    Identity/qualifying fields (name, phone, email, budget, location,
    intent) are merged progressively: a later turn's `None` never erases a
    fact already captured in an earlier turn. `intent_score`, `lead_score`,
    `summary`, and `next_action` represent the model's *current* best
    assessment of the whole conversation so far and are always overwritten.
    """

    def __init__(self, db: AsyncSession):
        self._db = db
        self._repo = LeadRepository(db)

    async def get_or_create(self, *, conversation_id: int, business_id: int) -> Lead:
        lead = await self._repo.get_by_conversation_id(conversation_id)
        if lead is None:
            lead = await self._repo.create(conversation_id=conversation_id, business_id=business_id)
        return lead

    async def record_extraction(self, *, conversation_id: int, business_id: int, extraction: LeadExtraction) -> Lead:
        lead = await self.get_or_create(conversation_id=conversation_id, business_id=business_id)

        for field in ("name", "phone", "email", "budget", "location", "intent"):
            new_value = getattr(extraction, field)
            if new_value is not None:
                setattr(lead, field, new_value)

        lead.intent_score = extraction.intent_score
        lead.lead_score = extraction.lead_score
        lead.category = categorize(extraction.lead_score)
        if extraction.summary:
            lead.summary = extraction.summary
        if extraction.next_action:
            lead.next_action = extraction.next_action

        await self._db.flush()
        return lead
