import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    type: Mapped[str] = mapped_column(String, nullable=False)  # 'image' | 'reel'
    category: Mapped[str | None] = mapped_column(String, nullable=True)
    platform: Mapped[str | None] = mapped_column(String, nullable=True)
    format: Mapped[str | None] = mapped_column(String, nullable=True)
    current_step: Mapped[str] = mapped_column(String, default="category")
    viral_dna_id: Mapped[str | None] = mapped_column(String, nullable=True)
    reel_mode: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="draft")  # draft | in_progress | completed
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    steps: Mapped[list["ProjectStep"]] = relationship(  # noqa: F821
        back_populates="project", cascade="all, delete-orphan", order_by="ProjectStep.step_order"
    )
    posts: Mapped[list["Post"]] = relationship(  # noqa: F821
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="Post.post_number",
    )
    trends: Mapped[list["ProjectTrend"]] = relationship(  # noqa: F821
        back_populates="project", cascade="all, delete-orphan", order_by="ProjectTrend.first_generated_at"
    )
