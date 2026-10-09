from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    APP_NAME: str = "ContentForge"
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite:///./contentforge.db"
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:5174"]
    ASSETS_DIR: str = str(Path(__file__).parent.parent / "assets")
    COMFYUI_BASE_URL: str = "http://127.0.0.1:8188"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
