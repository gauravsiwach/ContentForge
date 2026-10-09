from datetime import datetime
from pydantic import BaseModel
from app.schemas.step import StepResponse


class ProjectCreate(BaseModel):
    type: str  # 'image' | 'reel'
    category: str | None = None
    platform: str | None = None
    format: str | None = None


class ProjectUpdate(BaseModel):
    category: str | None = None
    platform: str | None = None
    format: str | None = None


class ProjectResponse(BaseModel):
    id: str
    type: str
    category: str | None
    platform: str | None
    format: str | None
    current_step: str
    viral_dna_id: str | None
    reel_mode: str
    status: str
    created_at: datetime
    updated_at: datetime
    steps: list[StepResponse]

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    id: str
    type: str
    category: str | None
    platform: str | None
    format: str | None
    current_step: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
