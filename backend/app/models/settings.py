import uuid
from sqlalchemy import String, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ProviderSettings(Base):
    __tablename__ = "provider_settings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_type: Mapped[str] = mapped_column(String, unique=True, nullable=False)  # text | image | vision
    mode: Mapped[str] = mapped_column(String, default="cloud")  # cloud | local
    provider: Mapped[str] = mapped_column(String, default="openai")
    api_key: Mapped[str | None] = mapped_column(String, nullable=True)
    model: Mapped[str | None] = mapped_column(String, nullable=True)
    base_url: Mapped[str | None] = mapped_column(String, nullable=True)
    extra_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
