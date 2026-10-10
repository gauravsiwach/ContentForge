import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Post(Base):
    __tablename__ = "posts"
    __table_args__ = (UniqueConstraint("project_id", "post_number", name="uq_posts_project_number"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(
        String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    post_number: Mapped[int] = mapped_column(Integer, nullable=False)
    current_step: Mapped[str] = mapped_column(String, default="trends", nullable=False)
    status: Mapped[str] = mapped_column(String, default="draft", nullable=False)
    selected_trend_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("project_trends.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    project: Mapped["Project"] = relationship(back_populates="posts")  # noqa: F821
    steps: Mapped[list["ProjectStep"]] = relationship(  # noqa: F821
        back_populates="post", cascade="all, delete-orphan", order_by="ProjectStep.step_order"
    )
    scenes: Mapped[list["SceneItem"]] = relationship(  # noqa: F821
        back_populates="post", cascade="all, delete-orphan", order_by="SceneItem.scene_number"
    )
    selected_trend: Mapped["ProjectTrend | None"] = relationship(
        back_populates="selected_by_posts", foreign_keys=[selected_trend_id]
    )  # noqa: F821
