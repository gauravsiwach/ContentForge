import uuid
from sqlalchemy import String, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    icon: Mapped[str | None] = mapped_column(String, nullable=True)
    keywords: Mapped[list] = mapped_column(JSON, default=list)
