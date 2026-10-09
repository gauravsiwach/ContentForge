from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.settings import ProviderSettings
from app.schemas.provider import ProviderSettingsUpdate, ProviderSettingsResponse, ProviderTestResult
from app.ai.provider import DEFAULT_PROVIDERS, test_connection

router = APIRouter(prefix="/api/settings", tags=["settings"])

VALID_TASK_TYPES = ("text", "image", "vision")


def get_or_create_provider(db: Session, task_type: str) -> ProviderSettings:
    """Get provider settings, creating with defaults if not yet saved."""
    settings = db.query(ProviderSettings).filter(ProviderSettings.task_type == task_type).first()
    if not settings:
        defaults = DEFAULT_PROVIDERS[task_type]
        settings = ProviderSettings(
            task_type=task_type,
            mode=defaults["mode"],
            provider=defaults["provider"],
            model=defaults["model"],
            base_url=defaults["base_url"],
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def mask_api_key(key: str | None) -> str | None:
    """Return a masked version of the API key for safe display."""
    if not key or len(key) < 8:
        return key
    return key[:4] + "•" * (len(key) - 8) + key[-4:]


@router.get("/providers", response_model=list[ProviderSettingsResponse])
def list_providers(db: Session = Depends(get_db)):
    providers = []
    for task_type in VALID_TASK_TYPES:
        p = get_or_create_provider(db, task_type)
        # Return with masked key
        p.api_key = mask_api_key(p.api_key)
        providers.append(p)
    return providers


@router.get("/providers/{task_type}", response_model=ProviderSettingsResponse)
def get_provider(task_type: str, db: Session = Depends(get_db)):
    if task_type not in VALID_TASK_TYPES:
        raise HTTPException(status_code=400, detail=f"task_type must be one of {VALID_TASK_TYPES}")
    p = get_or_create_provider(db, task_type)
    p.api_key = mask_api_key(p.api_key)
    return p


@router.put("/providers/{task_type}", response_model=ProviderSettingsResponse)
def update_provider(task_type: str, data: ProviderSettingsUpdate, db: Session = Depends(get_db)):
    if task_type not in VALID_TASK_TYPES:
        raise HTTPException(status_code=400, detail=f"task_type must be one of {VALID_TASK_TYPES}")
    p = get_or_create_provider(db, task_type)

    update_data = data.model_dump(exclude_unset=True)
    # Never overwrite a real key with a masked placeholder
    if "api_key" in update_data and update_data["api_key"] and "•" in update_data["api_key"]:
        update_data.pop("api_key")

    for key, value in update_data.items():
        setattr(p, key, value)

    db.commit()
    db.refresh(p)
    p.api_key = mask_api_key(p.api_key)
    return p


@router.post("/providers/{task_type}/test", response_model=ProviderTestResult)
async def test_provider(task_type: str, db: Session = Depends(get_db)):
    if task_type not in VALID_TASK_TYPES:
        raise HTTPException(status_code=400, detail=f"task_type must be one of {VALID_TASK_TYPES}")
    # Fetch with real (unmasked) key for actual connection
    p = db.query(ProviderSettings).filter(ProviderSettings.task_type == task_type).first()
    if not p:
        p = get_or_create_provider(db, task_type)
    success, message = await test_connection(p)
    return ProviderTestResult(success=success, message=message)
