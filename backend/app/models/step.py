import uuid
from sqlalchemy import String, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ProjectStep(Base):
    __tablename__ = "project_steps"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    step_name: Mapped[str] = mapped_column(String, nullable=False)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending | in_progress | completed | skipped | needs_refresh
    selected_attempt_id: Mapped[str | None] = mapped_column(String, nullable=True)
    input_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    project: Mapped["Project"] = relationship(back_populates="steps")  # noqa: F821
    attempts: Mapped[list["GenerationAttempt"]] = relationship(  # noqa: F821
        back_populates="step", cascade="all, delete-orphan", order_by="GenerationAttempt.attempt_number"
    )
