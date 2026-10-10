import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ProjectTrend(Base):
    """A trend candidate shared by all posts in one project."""

    __tablename__ = "project_trends"
    __table_args__ = (
        UniqueConstraint("project_id", "normalized_topic", name="uq_project_trends_topic"),
        Index("ix_project_trends_project_id", "project_id"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(
        String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    topic: Mapped[str] = mapped_column(String, nullable=False)
    normalized_topic: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source: Mapped[str] = mapped_column(String, default="generated", nullable=False)
    first_generated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_generated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    project: Mapped["Project"] = relationship(back_populates="trends")  # noqa: F821
    selected_by_posts: Mapped[list["Post"]] = relationship(
        back_populates="selected_trend", foreign_keys="Post.selected_trend_id"
    )
