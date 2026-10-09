from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Project, ProjectStep
from app.models.viral_dna import ViralDnaProfile
from app.schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
    NavigateRequest,
)
from app.services.workflow import create_project_steps, navigate_to_step

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    if data.type not in ("image", "reel"):
        raise HTTPException(status_code=400, detail="type must be 'image' or 'reel'")

    project = Project(
        type=data.type,
        category=data.category,
        platform=data.platform,
        format=data.format,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    create_project_steps(db, project)
    db.refresh(project)
    return project


@router.get("", response_model=list[ProjectListResponse])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(Project.created_at.desc()).all()


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, data: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)

    if update_data.get("category"):
        category_step = (
            db.query(ProjectStep)
            .filter(ProjectStep.project_id == project.id, ProjectStep.step_name == "category")
            .first()
        )
        if category_step:
            category_step.status = "completed"
        if project.status == "draft":
            project.status = "in_progress"

    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Viral DNA profiles are not connected to projects by a foreign key, so
    # SQLAlchemy's project/step cascade does not remove them automatically.
    profile_filter = ViralDnaProfile.project_id == project.id
    if project.viral_dna_id:
        profile_filter = or_(profile_filter, ViralDnaProfile.id == project.viral_dna_id)
    db.query(ViralDnaProfile).filter(profile_filter).delete(synchronize_session=False)

    db.delete(project)
    db.commit()
    return {"detail": "Project deleted"}


@router.post("/{project_id}/navigate", response_model=ProjectResponse)
def navigate_project(project_id: str, data: NavigateRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project = navigate_to_step(db, project, data.target_step, skip_current=data.skip_current)
    return project
