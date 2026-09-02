from pydantic import BaseModel


class UsageSummary(BaseModel):
    total_tokens: int
    reply_tokens: int
    extraction_tokens: int
    call_count: int
    includes_estimates: bool
