import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class GenerationAttempt(Base):
    __tablename__ = "generation_attempts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    step_id: Mapped[str] = mapped_column(String, ForeignKey("project_steps.id", ondelete="CASCADE"), nullable=False)
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    enhancement: Mapped[str | None] = mapped_column(Text, nullable=True)
    provider_used: Mapped[str | None] = mapped_column(String, nullable=True)
    model_used: Mapped[str | None] = mapped_column(String, nullable=True)
    prompt_used: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_selected: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    step: Mapped["ProjectStep"] = relationship(back_populates="attempts")  # noqa: F821
