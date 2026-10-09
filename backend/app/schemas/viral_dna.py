from pydantic import BaseModel


class ViralDnaAutoRequest(BaseModel):
    category: str | None = None


class ViralDnaManualRequest(BaseModel):
    url: str


class ViralDnaUpdateRequest(BaseModel):
    dna_data: dict


class ViralDnaResponse(BaseModel):
    id: str
    project_id: str
    source_type: str
    source_urls: list[str] | None
    category: str | None
    dna_data: dict

    model_config = {"from_attributes": True}
