import uuid
from sqlalchemy import String, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ViralDnaProfile(Base):
    __tablename__ = "viral_dna_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String, nullable=False)
    source_type: Mapped[str] = mapped_column(String, default="auto")  # auto | manual
    source_urls: Mapped[list | None] = mapped_column(JSON, nullable=True)
    category: Mapped[str | None] = mapped_column(String, nullable=True)
    dna_data: Mapped[dict] = mapped_column(JSON, nullable=False)
