from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Project, ProjectStep
from app.models.scene import SceneItem
from app.models.viral_dna import ViralDnaProfile
from app.schemas.scene import (
    ScenesUpdateRequest,
    SceneRetryRequest,
    SceneSelectRequest,
    SceneResponse,
)
from app.routers.settings import get_or_create_provider
from app.ai.image import generate_images, build_image_prompt

router = APIRouter(prefix="/api/projects/{project_id}/scenes", tags=["scenes"])


def _get_project_or_404(db: Session, project_id: str) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _get_scene_or_404(db: Session, project_id: str, scene_id: str) -> SceneItem:
    scene = (
        db.query(SceneItem)
        .filter(SceneItem.id == scene_id, SceneItem.project_id == project_id)
        .first()
    )
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    return scene


def _list_scenes(db: Session, project_id: str) -> list[SceneItem]:
    return (
        db.query(SceneItem)
        .filter(SceneItem.project_id == project_id)
        .order_by(SceneItem.scene_number)
        .all()
    )


def _get_dna_profile(db: Session, project: Project) -> dict | None:
    if not project.viral_dna_id:
        return None
    profile = db.query(ViralDnaProfile).filter(ViralDnaProfile.id == project.viral_dna_id).first()
    return profile.dna_data if profile else None


async def _generate_scene_image(
    db: Session, project: Project, scene: SceneItem, enhancement: str | None = None
) -> SceneItem:
    settings = get_or_create_provider(db, "image")
    dna_profile = _get_dna_profile(db, project)
    prompt = build_image_prompt(
        project.category or "lifestyle", scene.visual_desc, dna_profile, "cinematic", enhancement
    )
    images = await generate_images(settings, prompt, size="1024x1024", n=1)
    if not images:
        raise HTTPException(status_code=502, detail="Image generation returned no results")

    history = list(scene.image_history or [])
    history.append({"asset_url": images[0].get("asset_url"), "prompt_used": prompt, "enhancement": enhancement})
    scene.image_history = history
    scene.selected_history_index = len(history) - 1
    scene.image_url = images[0].get("asset_url")
    db.commit()
    db.refresh(scene)
    return scene


@router.get("", response_model=list[SceneResponse])
def list_scenes(project_id: str, db: Session = Depends(get_db)):
    _get_project_or_404(db, project_id)
    return _list_scenes(db, project_id)


@router.put("", response_model=list[SceneResponse])
def update_scenes(project_id: str, data: ScenesUpdateRequest, db: Session = Depends(get_db)):
    """Bulk save inline script edits — add/remove/reorder scenes, preserving images by scene_number."""
    _get_project_or_404(db, project_id)
    existing = {s.scene_number: s for s in _list_scenes(db, project_id)}

    kept_numbers = set()
    for edit in data.scenes:
        kept_numbers.add(edit.scene_number)
        item = existing.get(edit.scene_number)
        if not item:
            item = SceneItem(project_id=project_id, scene_number=edit.scene_number)
            db.add(item)
        item.narration = edit.narration
        item.visual_desc = edit.visual_desc
        item.duration_sec = edit.duration_sec

    for number, item in existing.items():
        if number not in kept_numbers:
            db.delete(item)

    db.commit()
    return _list_scenes(db, project_id)


@router.post("/generate-all", response_model=list[SceneResponse])
async def generate_all(project_id: str, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    scenes = _list_scenes(db, project_id)
    if not scenes:
        raise HTTPException(status_code=400, detail="Generate a script first")

    for scene in scenes:
        await _generate_scene_image(db, project, scene)

    return _list_scenes(db, project_id)


@router.post("/{scene_id}/generate-image", response_model=SceneResponse)
async def generate_one(project_id: str, scene_id: str, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    scene = _get_scene_or_404(db, project_id, scene_id)
    return await _generate_scene_image(db, project, scene)


@router.post("/{scene_id}/retry", response_model=SceneResponse)
async def retry_one(project_id: str, scene_id: str, data: SceneRetryRequest, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    scene = _get_scene_or_404(db, project_id, scene_id)
    return await _generate_scene_image(db, project, scene, data.enhancement)


@router.put("/{scene_id}/select", response_model=SceneResponse)
def select_variant(project_id: str, scene_id: str, data: SceneSelectRequest, db: Session = Depends(get_db)):
    _get_project_or_404(db, project_id)
    scene = _get_scene_or_404(db, project_id, scene_id)
    history = scene.image_history or []
    if data.history_index < 0 or data.history_index >= len(history):
        raise HTTPException(status_code=400, detail="history_index out of range")

    scene.selected_history_index = data.history_index
    scene.image_url = history[data.history_index].get("asset_url")
    db.commit()
    db.refresh(scene)
    return scene
