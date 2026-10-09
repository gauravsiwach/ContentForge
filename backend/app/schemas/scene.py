from pydantic import BaseModel


class SceneEditItem(BaseModel):
    scene_number: int
    narration: str
    visual_desc: str
    duration_sec: float = 7.0


class ScenesUpdateRequest(BaseModel):
    scenes: list[SceneEditItem]


class SceneRetryRequest(BaseModel):
    enhancement: str | None = None


class SceneSelectRequest(BaseModel):
    history_index: int


class SceneResponse(BaseModel):
    id: str
    project_id: str
    scene_number: int
    narration: str
    visual_desc: str
    duration_sec: float
    image_url: str | None
    image_history: list | None
    selected_history_index: int

    model_config = {"from_attributes": True}
