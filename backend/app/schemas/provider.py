from pydantic import BaseModel


class ProviderSettingsUpdate(BaseModel):
    mode: str | None = None          # 'cloud' | 'local'
    provider: str | None = None      # 'openai' | 'ollama' | 'anthropic'
    api_key: str | None = None
    model: str | None = None
    base_url: str | None = None
    extra_config: dict | None = None


class ProviderSettingsResponse(BaseModel):
    id: str
    task_type: str
    mode: str
    provider: str
    api_key: str | None          # returned masked
    model: str | None
    base_url: str | None
    extra_config: dict | None

    model_config = {"from_attributes": True}


class ProviderTestResult(BaseModel):
    success: bool
    message: str
