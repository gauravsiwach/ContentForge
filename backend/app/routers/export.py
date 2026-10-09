from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Project, ProjectStep, GenerationAttempt

router = APIRouter(prefix="/api/projects", tags=["export"])


def _selected_output(db: Session, project_id: str, step_name: str) -> tuple[ProjectStep | None, dict | None]:
    step = (
        db.query(ProjectStep)
        .filter(ProjectStep.project_id == project_id, ProjectStep.step_name == step_name)
        .first()
    )
    if not step or not step.selected_attempt_id:
        return step, None
    attempt = db.query(GenerationAttempt).filter(GenerationAttempt.id == step.selected_attempt_id).first()
    return step, (attempt.output_data if attempt else None)


@router.post("/{project_id}/export")
def export_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    caption_step, caption_data = _selected_output(db, project_id, "caption")
    image_step, image_data = _selected_output(db, project_id, "visuals")

    if not caption_data or not image_data:
        raise HTTPException(status_code=400, detail="Select a caption and an image before exporting")

    variant_idx = (caption_step.input_data or {}).get("selected_variant", 0) if caption_step else 0
    captions = caption_data.get("captions", [])
    caption = captions[variant_idx] if captions and variant_idx < len(captions) else (captions[0] if captions else {})

    image_idx = (image_step.input_data or {}).get("selected_index", 0) if image_step else 0
    images = image_data.get("images", [])
    image = images[image_idx] if images and image_idx < len(images) else (images[0] if images else {})

    project.status = "completed"
    review_step = (
        db.query(ProjectStep)
        .filter(ProjectStep.project_id == project_id, ProjectStep.step_name == "review")
        .first()
    )
    if review_step:
        review_step.status = "completed"
    db.commit()

    return {
        "caption": caption.get("text"),
        "hashtags": caption.get("hashtags", []),
        "image_url": image.get("asset_url"),
    }
