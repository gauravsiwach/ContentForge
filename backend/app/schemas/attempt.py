from datetime import datetime
from pydantic import BaseModel


class AttemptResponse(BaseModel):
    id: str
    step_id: str
    attempt_number: int
    enhancement: str | None
    provider_used: str | None
    model_used: str | None
    output_data: dict | None
    is_selected: bool
    created_at: datetime

    model_config = {"from_attributes": True}
