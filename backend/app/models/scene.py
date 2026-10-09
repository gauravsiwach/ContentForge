import uuid
from sqlalchemy import String, Integer, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class SceneItem(Base):
    __tablename__ = "scene_items"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String, nullable=False)
    scene_number: Mapped[int] = mapped_column(Integer, nullable=False)
    narration: Mapped[str] = mapped_column(String, default="")
    visual_desc: Mapped[str] = mapped_column(String, default="")
    duration_sec: Mapped[float] = mapped_column(Float, default=7.0)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    # History of generated image variants for this scene — [{asset_url, prompt_used, enhancement}]
    image_history: Mapped[list | None] = mapped_column(JSON, nullable=True)
    selected_history_index: Mapped[int] = mapped_column(Integer, default=0)
