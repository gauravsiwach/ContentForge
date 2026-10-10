import uuid
from sqlalchemy import Index, String, Integer, ForeignKey, JSON, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ProjectStep(Base):
    __tablename__ = "project_steps"
    __table_args__ = (
        Index(
            "uq_project_steps_shared_step",
            "project_id",
            "step_name",
            unique=True,
            sqlite_where=text("post_id IS NULL"),
        ),
        Index(
            "uq_project_steps_post_step",
            "post_id",
            "step_name",
            unique=True,
            sqlite_where=text("post_id IS NOT NULL"),
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    post_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("posts.id", ondelete="CASCADE"), nullable=True
    )
    step_name: Mapped[str] = mapped_column(String, nullable=False)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending | in_progress | completed | skipped | needs_refresh
    selected_attempt_id: Mapped[str | None] = mapped_column(String, nullable=True)
    input_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    project: Mapped["Project"] = relationship(back_populates="steps")  # noqa: F821
    post: Mapped["Post | None"] = relationship(back_populates="steps")  # noqa: F821
    attempts: Mapped[list["GenerationAttempt"]] = relationship(  # noqa: F821
        back_populates="step", cascade="all, delete-orphan", order_by="GenerationAttempt.attempt_number"
    )
