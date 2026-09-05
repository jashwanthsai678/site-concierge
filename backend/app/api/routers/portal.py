from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_business, get_db
from app.crm.lead_repository import LeadRepository
from app.knowledge.ingestion_service import ingest_business
from app.models.business import Business
from app.models.knowledge import KnowledgeItem
from app.models.token_usage import TokenUsageLog
from app.schemas.business import (
    IngestRequest,
    IngestResponse,
    KnowledgeBulkCreate,
    KnowledgeItemRead,
    KnowledgeItemUpdate,
    PortalBusinessRead,
    PortalBusinessUpdate,
)
from app.schemas.lead import LeadRead
from app.schemas.usage import UsageSummary

router = APIRouter(prefix="/api/portal", tags=["portal"])

_UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "uploads" / "mascots"
_ALLOWED_CONTENT_TYPES = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
_MAX_UPLOAD_BYTES = 3 * 1024 * 1024  # 3MB — a mascot image, not a photo album


def _sniff_image_extension(body: bytes) -> str | None:
    """Identifies the file type from its actual byte signature rather than
    trusting the client-supplied Content-Type header, which is trivially
    spoofable — without this, any file could be uploaded and stored under
    an image extension (and served publicly from /uploads/mascots/) as
    long as the request claimed to be image/png.
    """
    if body.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if body.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if body[:4] == b"RIFF" and body[8:12] == b"WEBP":
        return "webp"
    return None


@router.get("/me", response_model=PortalBusinessRead)
async def get_my_business(business: Business = Depends(get_current_business)) -> Business:
    return business


@router.patch("/me", response_model=PortalBusinessRead)
async def update_my_business(
    payload: PortalBusinessUpdate,
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db),
) -> Business:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(business, field, value)
    await db.commit()
    await db.refresh(business)
    return business


@router.post("/mascot-image", response_model=PortalBusinessRead)
async def upload_mascot_image(
    file: UploadFile,
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db),
) -> Business:
    """Lets a business bring their own character art instead of the single
    built-in registry mascot (see frontend lib/mascotRegistry.ts) — one
    image per business, used for both the full-body and bubble views on
    the frontend (which crops/positions the same file differently rather
    than requiring two separate uploads).
    """
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only PNG, JPEG, or WebP images are accepted.")

    body = await file.read()
    if len(body) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Image must be under 3MB.")

    extension = _sniff_image_extension(body)
    if extension is None:
        raise HTTPException(status_code=400, detail="That file doesn't look like a valid PNG, JPEG, or WebP image.")

    _UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    _delete_existing_mascot_files(business.id)
    (_UPLOADS_DIR / f"{business.id}.{extension}").write_bytes(body)

    business.mascot_image_url = f"/uploads/mascots/{business.id}.{extension}"
    await db.commit()
    await db.refresh(business)
    return business


@router.delete("/mascot-image", response_model=PortalBusinessRead)
async def delete_mascot_image(
    business: Business = Depends(get_current_business), db: AsyncSession = Depends(get_db),
) -> Business:
    _delete_existing_mascot_files(business.id)
    business.mascot_image_url = None
    await db.commit()
    await db.refresh(business)
    return business


def _delete_existing_mascot_files(business_id: int) -> None:
    """Removes any previously uploaded file for this business regardless of
    extension — needed because a re-upload in a different format (e.g. jpg
    replacing a png) would otherwise leave the old file orphaned on disk."""
    if not _UPLOADS_DIR.exists():
        return
    for existing in _UPLOADS_DIR.glob(f"{business_id}.*"):
        existing.unlink(missing_ok=True)


@router.get("/knowledge", response_model=list[KnowledgeItemRead])
async def list_my_knowledge(
    business: Business = Depends(get_current_business), db: AsyncSession = Depends(get_db),
) -> list[KnowledgeItem]:
    result = await db.execute(
        select(KnowledgeItem).where(KnowledgeItem.business_id == business.id).order_by(KnowledgeItem.display_order)
    )
    return list(result.scalars().all())


@router.post("/knowledge", status_code=201)
async def add_my_knowledge(
    payload: KnowledgeBulkCreate,
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db),
) -> dict:
    existing_count = (
        await db.execute(select(KnowledgeItem).where(KnowledgeItem.business_id == business.id))
    ).scalars().all()
    next_order = len(existing_count)
    for offset, item in enumerate(payload.items):
        db.add(KnowledgeItem(
            business_id=business.id, category=item.category, question=item.question,
            content=item.content, display_order=next_order + offset,
        ))
    await db.commit()
    return {"items_added": len(payload.items)}


@router.patch("/knowledge/{item_id}", response_model=KnowledgeItemRead)
async def update_my_knowledge_item(
    item_id: int,
    payload: KnowledgeItemUpdate,
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeItem:
    item = await _get_owned_knowledge_item(db, item_id, business.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/knowledge/{item_id}", status_code=204)
async def delete_my_knowledge_item(
    item_id: int, business: Business = Depends(get_current_business), db: AsyncSession = Depends(get_db),
) -> None:
    item = await _get_owned_knowledge_item(db, item_id, business.id)
    await db.delete(item)
    await db.commit()


@router.post("/ingest", response_model=IngestResponse)
async def trigger_my_ingestion(
    payload: IngestRequest, business: Business = Depends(get_current_business),
) -> IngestResponse:
    try:
        chunk_count = await ingest_business(business.id, website_url=payload.website_url)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not reach the RAG vector store — check QDRANT_URL/QDRANT_API_KEY in backend/.env.",
        ) from exc
    return IngestResponse(chunks_ingested=chunk_count)


@router.get("/usage", response_model=UsageSummary)
async def get_my_usage(
    business: Business = Depends(get_current_business), db: AsyncSession = Depends(get_db),
) -> UsageSummary:
    """Cost visibility that didn't exist before this — total LLM tokens
    spent for this business, broken down by call type. `reply` tokens are
    an estimate (~4 chars/token on the streamed text, see
    conversation/turn_orchestrator.py's `_record_usage`); `extraction`
    tokens are exact, as reported by Groq.
    """
    rows = (
        await db.execute(select(TokenUsageLog).where(TokenUsageLog.business_id == business.id))
    ).scalars().all()

    reply_tokens = sum(row.total_tokens for row in rows if row.call_type == "reply")
    extraction_tokens = sum(row.total_tokens for row in rows if row.call_type == "extraction")
    return UsageSummary(
        total_tokens=reply_tokens + extraction_tokens,
        reply_tokens=reply_tokens,
        extraction_tokens=extraction_tokens,
        call_count=len(rows),
        includes_estimates=any(row.is_estimated for row in rows),
    )


@router.get("/leads", response_model=list[LeadRead])
async def list_my_leads(
    business: Business = Depends(get_current_business), db: AsyncSession = Depends(get_db),
) -> list:
    leads = await LeadRepository(db).list_by_business(business.id)
    return [LeadRead.model_validate(lead) for lead in leads]


async def _get_owned_knowledge_item(db: AsyncSession, item_id: int, business_id: int) -> KnowledgeItem:
    item = await db.get(KnowledgeItem, item_id)
    if item is None or item.business_id != business_id:
        raise HTTPException(status_code=404, detail=f"Knowledge item {item_id} not found.")
    return item
