from pydantic import BaseModel
from app.schemas.attempt import AttemptResponse


class StepResponse(BaseModel):
    id: str
    project_id: str
    post_id: str | None = None
    step_name: str
    step_order: int
    status: str
    selected_attempt_id: str | None
    input_data: dict | None
    attempts: list[AttemptResponse]

    model_config = {"from_attributes": True}


class NavigateRequest(BaseModel):
    target_step: str
    skip_current: bool = False
