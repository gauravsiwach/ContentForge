import logging
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Project, ProjectStep
from app.models.viral_dna import ViralDnaProfile
from app.schemas.viral_dna import (
    ViralDnaAutoRequest,
    ViralDnaManualRequest,
    ViralDnaUpdateRequest,
    ViralDnaResponse,
)
from app.routers.settings import get_or_create_provider
from app.viral_dna.discover import discover_viral_images
from app.ai.vision import analyze_multiple_images, analyze_image_for_dna

router = APIRouter(prefix="/api/projects/{project_id}/viral-dna", tags=["viral-dna"])
logger = logging.getLogger(__name__)


def _database_context(db: Session) -> str:
    """Describe the actual DB target to diagnose relative SQLite URL mismatches."""
    url = db.get_bind().url
    if url.get_backend_name() != "sqlite" or url.database in (None, ":memory:"):
        return f"url={url}; cwd={os.getcwd()}"
    path = Path(url.database)
    if not path.is_absolute():
        path = Path.cwd() / path
    return f"url={url}; resolved_path={path.resolve()}; cwd={os.getcwd()}"


def _get_project_or_404(db: Session, project_id: str) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _get_profile_or_404(db: Session, project: Project) -> ViralDnaProfile:
    profile = (
        db.query(ViralDnaProfile).filter(ViralDnaProfile.id == project.viral_dna_id).first()
        if project.viral_dna_id
        else None
    )
    if not profile:
        raise HTTPException(status_code=404, detail="No viral DNA profile yet")
    return profile


def _save_profile(
    db: Session,
    project: Project,
    source_type: str,
    source_urls: list[str],
    category: str | None,
    dna_data: dict,
) -> ViralDnaProfile:
    logger.info(
        "viral_dna.save.start project_id=%s source=%s source_count=%d db={%s}",
        project.id,
        source_type,
        len(source_urls),
        _database_context(db),
    )
    profile = None
    if project.viral_dna_id:
        profile = db.query(ViralDnaProfile).filter(ViralDnaProfile.id == project.viral_dna_id).first()
    if not profile:
        profile = ViralDnaProfile(project_id=project.id)
        db.add(profile)

    profile.source_type = source_type
    profile.source_urls = source_urls
    profile.category = category
    profile.dna_data = dna_data
    db.commit()
    db.refresh(profile)

    project.viral_dna_id = profile.id
    dna_step = (
        db.query(ProjectStep)
        .filter(ProjectStep.project_id == project.id, ProjectStep.step_name == "viral_dna")
        .first()
    )
    if dna_step:
        previous_status = dna_step.status
        dna_step.status = "completed"
        logger.info(
            "viral_dna.step.marked_completed project_id=%s step_id=%s previous_status=%s",
            project.id,
            dna_step.id,
            previous_status,
        )
    else:
        logger.error("viral_dna.step.missing project_id=%s", project.id)
    db.commit()
    logger.info(
        "viral_dna.save.committed project_id=%s profile_id=%s viral_dna_id=%s step_status=%s db={%s}",
        project.id,
        profile.id,
        project.viral_dna_id,
        dna_step.status if dna_step else "missing",
        _database_context(db),
    )
    return profile


@router.post("/auto", response_model=ViralDnaResponse, status_code=201)
async def auto_discover(project_id: str, data: ViralDnaAutoRequest, db: Session = Depends(get_db)):
    logger.info(
        "viral_dna.auto.start project_id=%s requested_category=%s db={%s}",
        project_id,
        data.category,
        _database_context(db),
    )
    project = _get_project_or_404(db, project_id)
    category = data.category or project.category or "lifestyle"
    step = (
        db.query(ProjectStep)
        .filter(ProjectStep.project_id == project.id, ProjectStep.step_name == "viral_dna")
        .first()
    )
    logger.info(
        "viral_dna.auto.project_loaded project_id=%s category=%s current_step=%s viral_dna_id=%s step_id=%s step_status=%s",
        project.id,
        category,
        project.current_step,
        project.viral_dna_id,
        step.id if step else "missing",
        step.status if step else "missing",
    )

    try:
        image_urls = await discover_viral_images(category)
        logger.info("viral_dna.auto.discovery_complete project_id=%s image_count=%d", project.id, len(image_urls))
        vision_settings = get_or_create_provider(db, "vision")
        dna_data = await analyze_multiple_images(vision_settings, image_urls, category)
        logger.info("viral_dna.auto.analysis_complete project_id=%s", project.id)
    except Exception:
        logger.exception("viral_dna.auto.failed project_id=%s stage=discover_or_analyze", project.id)
        raise

    return _save_profile(db, project, "auto", image_urls[:3], category, dna_data)


@router.post("/manual", response_model=ViralDnaResponse, status_code=201)
async def manual_analyze(project_id: str, data: ViralDnaManualRequest, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    category = project.category or "lifestyle"

    vision_settings = get_or_create_provider(db, "vision")
    dna_data = await analyze_image_for_dna(vision_settings, data.url, category)

    return _save_profile(db, project, "manual", [data.url], category, dna_data)


@router.get("", response_model=ViralDnaResponse)
def get_dna(project_id: str, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    return _get_profile_or_404(db, project)


@router.put("", response_model=ViralDnaResponse)
def update_dna(project_id: str, data: ViralDnaUpdateRequest, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    profile = _get_profile_or_404(db, project)

    profile.dna_data = {**profile.dna_data, **data.dna_data}
    db.commit()
    db.refresh(profile)
    return profile
