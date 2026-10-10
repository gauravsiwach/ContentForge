from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.step import StepResponse


class PostResponse(BaseModel):
    id: str
    project_id: str
    post_number: int
    current_step: str
    status: str
    selected_trend_id: str | None = None
    created_at: datetime
    updated_at: datetime
    steps: list[StepResponse]

    model_config = ConfigDict(from_attributes=True)


class PostListResponse(BaseModel):
    id: str
    project_id: str
    post_number: int
    current_step: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PostCompletionResponse(BaseModel):
    post: PostResponse
    project_status: str


class TrendUsageResponse(BaseModel):
    topic: str
    post_id: str
    post_number: int
    trend_id: str | None = None


class TrendPostUsage(BaseModel):
    post_id: str
    post_number: int


class ProjectTrendResponse(BaseModel):
    id: str
    project_id: str
    topic: str
    description: str | None
    score: int | None
    source: str
    first_generated_at: datetime | None
    last_generated_at: datetime | None
    used_by_posts: list[TrendPostUsage]


class TrendSelectionRequest(BaseModel):
    trend_id: str | None
