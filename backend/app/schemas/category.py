from pydantic import BaseModel


class CategoryResponse(BaseModel):
    id: str
    name: str
    icon: str | None
    keywords: list[str]

    model_config = {"from_attributes": True}
