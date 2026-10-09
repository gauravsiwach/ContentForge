import asyncio
import logging
import uuid
from typing import Awaitable, Callable

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.database import SessionLocal, get_db
from app.models import Project, ProjectStep
from app.models.attempt import GenerationAttempt
from app.models.viral_dna import ViralDnaProfile
from app.models.scene import SceneItem
from app.schemas.attempt import AttemptResponse
from app.schemas.step import StepResponse
from app.routers.settings import get_or_create_provider
from app.ai.text import generate_content, generate_trends, generate_script
from app.ai.image import generate_images, build_image_prompt
from pydantic import BaseModel

router = APIRouter(prefix="/api/steps", tags=["steps"])
logger = logging.getLogger(__name__)

# In-process job state is appropriate for this local, single-backend workflow.
# GenerationAttempt remains the durable record once a job completes.
_generation_jobs: dict[str, dict] = {}
ProgressCallback = Callable[[int | None, str], Awaitable[None]]

# ---------------------------------------------------------------------------
# Mock data generators — still used for reel steps not yet wired (Phase 5 scope)
# ---------------------------------------------------------------------------

MOCK_VIRAL_DNA = {
    "colors": ["#FF4136", "#FF851B", "#FFDC00"],
    "style": "bold_minimal",
    "mood": "energetic",
    "cta": "save_share",
    "hooks": ["transformation", "challenge", "results"],
}

MOCK_CONTENT_VARIANTS = [
    {
        "overlay_text": "Discipline beats motivation. Every single day.",
        "feed_caption": "🔥 Motivation gets you started. Discipline keeps you going. Show up even when you don't feel like it — that's where real change happens. Save this as your daily reminder. 💪",
        "hashtags": ["#discipline", "#motivation", "#fitness", "#mindset", "#consistency", "#workout", "#fitnessmotivation"],
    },
    {
        "overlay_text": "No gym? No excuse. 20 min. Full body.",
        "feed_caption": "💥 You don't need a gym to get results. 20 minutes, zero equipment, full intensity. Drop a 🔥 if you're doing this today!",
        "hashtags": ["#homeworkout", "#noexcuses", "#fitness", "#hiit", "#bodyweight", "#fitlife", "#training"],
    },
    {
        "overlay_text": "The body achieves what the mind believes.",
        "feed_caption": "⚡ Your mindset is your strongest muscle. Before every rep, every set — believe. The results follow the belief. Start with your why.",
        "hashtags": ["#mindset", "#fitness", "#believe", "#motivation", "#workout", "#mentalstrength", "#goals"],
    },
]

MOCK_TRENDS = [
    {"topic": "75 Hard Challenge", "score": 92, "description": "Trending across fitness communities"},
    {"topic": "HIIT Cardio Finishers", "score": 87, "description": "High engagement on Reels"},
    {"topic": "Protein Meal Prep", "score": 84, "description": "Rising in food + fitness crossover"},
    {"topic": "Barefoot Training", "score": 76, "description": "Growing niche community"},
]


def _next_attempt_number(db: Session, step_id: str) -> int:
    count = db.query(GenerationAttempt).filter(GenerationAttempt.step_id == step_id).count()
    return count + 1


def _get_step_or_404(db: Session, step_id: str) -> ProjectStep:
    step = db.query(ProjectStep).filter(ProjectStep.id == step_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    return step


def _get_project_for_step(db: Session, step: ProjectStep) -> Project:
    project = db.query(Project).filter(Project.id == step.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found for step")
    return project


def _get_dna_profile(db: Session, project: Project) -> dict | None:
    if not project.viral_dna_id:
        return None
    profile = db.query(ViralDnaProfile).filter(ViralDnaProfile.id == project.viral_dna_id).first()
    return profile.dna_data if profile else None


def _get_step_by_name(db: Session, project_id: str, step_name: str) -> ProjectStep | None:
    return (
        db.query(ProjectStep)
        .filter(ProjectStep.project_id == project_id, ProjectStep.step_name == step_name)
        .first()
    )


def _get_selected_trend(db: Session, project_id: str) -> str | None:
    step = _get_step_by_name(db, project_id, "trends")
    return (step.input_data or {}).get("selected_topic") if step else None


def _get_selected_caption_text(db: Session, project_id: str) -> str | None:
    """Return the approved overlay_text from the content step for use in image prompt building."""
    step = _get_step_by_name(db, project_id, "caption")
    if not step:
        return None
    # Use selected attempt or latest
    attempt = None
    if step.selected_attempt_id:
        attempt = db.query(GenerationAttempt).filter(GenerationAttempt.id == step.selected_attempt_id).first()
    if not attempt:
        attempt = (
            db.query(GenerationAttempt)
            .filter(GenerationAttempt.step_id == step.id)
            .order_by(GenerationAttempt.attempt_number.desc())
            .first()
        )
    if not attempt or not attempt.output_data:
        return None
    variants = attempt.output_data.get("variants", [])
    idx = (step.input_data or {}).get("selected_variant", 0)
    if variants and idx < len(variants):
        return variants[idx].get("overlay_text") or variants[idx].get("feed_caption")
    return None


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class GenerateRequest(BaseModel):
    pass


class RetryRequest(BaseModel):
    enhancement: str | None = None


class SelectRequest(BaseModel):
    attempt_id: str


class UpdateStepDataRequest(BaseModel):
    input_data: dict


async def _run_visual_generation_job(job_id: str, step_id: str, enhancement: str | None = None) -> None:
    db = SessionLocal()
    job = _generation_jobs[job_id]
    job.update({"status": "running", "message": "Connecting to image provider…"})

    async def report_progress(percentage: int | None, message: str) -> None:
        job.update({"status": "running", "progress": percentage, "message": message})

    try:
        step = _get_step_or_404(db, step_id)
        step.status = "in_progress"
        db.commit()
        attempt_number = _next_attempt_number(db, step_id)
        output = await _generate_output_for_step(
            db, step, enhancement=enhancement, variation=attempt_number,
            progress_callback=report_progress,
        )
        attempt = GenerationAttempt(
            step_id=step_id,
            attempt_number=attempt_number,
            enhancement=enhancement,
            provider_used=output.pop("_provider", None),
            model_used=output.pop("_model", None),
            output_data=output,
        )
        db.add(attempt)
        step.status = "completed"
        db.commit()
        db.refresh(attempt)
        job.update({
            "status": "completed",
            "progress": 100,
            "message": "Images ready",
            "attempt": AttemptResponse.model_validate(attempt).model_dump(mode="json"),
        })
    except Exception as exc:
        db.rollback()
        logger.exception("Image generation job %s failed", job_id)
        job.update({"status": "failed", "message": "Image generation failed", "error": str(exc)})
    finally:
        db.close()


def _start_visual_generation_job(step_id: str, enhancement: str | None = None) -> dict:
    job_id = str(uuid.uuid4())
    _generation_jobs[job_id] = {
        "job_id": job_id,
        "step_id": step_id,
        "status": "queued",
        "progress": None,
        "message": "Preparing image generation…",
    }
    asyncio.create_task(_run_visual_generation_job(job_id, step_id, enhancement))
    return {key: value for key, value in _generation_jobs[job_id].items() if key != "step_id"}


# ---------------------------------------------------------------------------
# Attempt endpoints
# ---------------------------------------------------------------------------

@router.get("/{step_id}/attempts", response_model=list[AttemptResponse])
def list_attempts(step_id: str, db: Session = Depends(get_db)):
    _get_step_or_404(db, step_id)
    return (
        db.query(GenerationAttempt)
        .filter(GenerationAttempt.step_id == step_id)
        .order_by(GenerationAttempt.attempt_number)
        .all()
    )


@router.post("/{step_id}/generate", status_code=201)
async def generate(
    step_id: str,
    response: Response,
    _: GenerateRequest = GenerateRequest(),
    db: Session = Depends(get_db),
):
    step = _get_step_or_404(db, step_id)
    if step.step_name == "visuals":
        response.status_code = 202
        return _start_visual_generation_job(step_id)

    step.status = "in_progress"
    db.commit()
    attempt_number = _next_attempt_number(db, step_id)

    output = await _generate_output_for_step(db, step)

    attempt = GenerationAttempt(
        step_id=step_id,
        attempt_number=attempt_number,
        provider_used=output.pop("_provider", None),
        model_used=output.pop("_model", None),
        output_data=output,
    )
    db.add(attempt)
    step.status = "completed"
    db.commit()
    db.refresh(attempt)

    if step.step_name == "script":
        _sync_scene_items_from_script(db, step.project_id, output.get("scenes", []))

    return AttemptResponse.model_validate(attempt)


@router.post("/{step_id}/retry", status_code=201)
async def retry(
    step_id: str,
    data: RetryRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    step = _get_step_or_404(db, step_id)
    if step.step_name == "visuals":
        response.status_code = 202
        return _start_visual_generation_job(step_id, data.enhancement)

    step.status = "in_progress"
    db.commit()
    attempt_number = _next_attempt_number(db, step_id)

    output = await _generate_output_for_step(db, step, enhancement=data.enhancement, variation=attempt_number)

    attempt = GenerationAttempt(
        step_id=step_id,
        attempt_number=attempt_number,
        enhancement=data.enhancement,
        provider_used=output.pop("_provider", None),
        model_used=output.pop("_model", None),
        output_data=output,
    )
    db.add(attempt)
    step.status = "completed"
    db.commit()
    db.refresh(attempt)

    if step.step_name == "script":
        _sync_scene_items_from_script(db, step.project_id, output.get("scenes", []))

    return AttemptResponse.model_validate(attempt)


@router.get("/generation-jobs/{job_id}")
def get_generation_job(job_id: str):
    job = _generation_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Generation job not found")
    return dict(job)


@router.put("/{step_id}/select", response_model=AttemptResponse)
def select_attempt(step_id: str, data: SelectRequest, db: Session = Depends(get_db)):
    step = _get_step_or_404(db, step_id)

    # Unselect all
    db.query(GenerationAttempt).filter(GenerationAttempt.step_id == step_id).update(
        {"is_selected": False}
    )
    # Select the chosen one
    attempt = db.query(GenerationAttempt).filter(GenerationAttempt.id == data.attempt_id).first()
    if not attempt or attempt.step_id != step_id:
        raise HTTPException(status_code=404, detail="Attempt not found for this step")

    attempt.is_selected = True
    step.selected_attempt_id = attempt.id
    step.status = "completed"
    db.commit()
    db.refresh(attempt)
    return attempt


@router.put("/{step_id}", response_model=StepResponse)
def update_step_data(step_id: str, data: UpdateStepDataRequest, db: Session = Depends(get_db)):
    """Persist inline edits/selections (e.g. selected trend, caption variant, style preset)."""
    step = _get_step_or_404(db, step_id)
    step.input_data = {**(step.input_data or {}), **data.input_data}
    if step.step_name == "trends" and data.input_data.get("selected_topic"):
        step.status = "completed"
    db.commit()
    db.refresh(step)
    return step


# ---------------------------------------------------------------------------
# Real AI output generation, dispatched by step name
# ---------------------------------------------------------------------------

async def _generate_output_for_step(
    db: Session,
    step: ProjectStep,
    enhancement: str | None = None,
    variation: int = 1,
    progress_callback: ProgressCallback | None = None,
) -> dict:
    project = _get_project_for_step(db, step)
    category = project.category or "lifestyle"
    platform = project.platform or "instagram"

    if step.step_name == "trends":
        settings = get_or_create_provider(db, "text")
        data = await generate_trends(settings, category, platform)
        return {"type": "trends", "_provider": settings.provider, "_model": settings.model, **data}

    if step.step_name == "caption":
        settings = get_or_create_provider(db, "text")
        dna_profile = _get_dna_profile(db, project)
        trend_topic = _get_selected_trend(db, project.id)
        data = await generate_content(settings, category, platform, dna_profile, trend_topic, enhancement)
        return {"type": "content", "_provider": settings.provider, "_model": settings.model, **data}

    if step.step_name == "visuals":
        settings = get_or_create_provider(db, "image")
        dna_profile = _get_dna_profile(db, project)
        caption_text = _get_selected_caption_text(db, project.id)
        style_preset = (step.input_data or {}).get("style_preset", "minimal")
        prompt = build_image_prompt(category, caption_text, dna_profile, style_preset, enhancement)
        images = await generate_images(
            settings, prompt, size="1024x1024", n=1,
            progress_callback=progress_callback,
        )
        return {
            "type": "image",
            "_provider": settings.provider,
            "_model": settings.model,
            "images": images,
            "prompt_used": prompt,
        }

    if step.step_name == "script":
        settings = get_or_create_provider(db, "text")
        dna_profile = _get_dna_profile(db, project)
        trend_topic = _get_selected_trend(db, project.id)
        duration_target = (step.input_data or {}).get("duration_target", 30)
        data = await generate_script(settings, category, platform, duration_target, dna_profile, trend_topic, enhancement)
        return {"type": "script", "_provider": settings.provider, "_model": settings.model, **data}

    # Reel steps not yet wired (audio, assembly — Phase 5 scope) remain mock
    return _mock_output_for_step(step.step_name, variation)


def _sync_scene_items_from_script(db: Session, project_id: str, scenes: list[dict]) -> None:
    """Replace this project's scene_items with the freshly generated script scenes."""
    existing = {s.scene_number: s for s in db.query(SceneItem).filter(SceneItem.project_id == project_id).all()}

    for scene in scenes:
        number = scene.get("scene_number") or scene.get("order")
        if number is None:
            continue
        item = existing.pop(number, None)
        if not item:
            item = SceneItem(project_id=project_id, scene_number=number)
            db.add(item)
        item.narration = scene.get("narration", "")
        item.visual_desc = scene.get("visual_desc", "")
        item.duration_sec = scene.get("duration_sec") or scene.get("duration") or 7.0

    # Remove scenes that no longer exist in the latest script
    for leftover in existing.values():
        db.delete(leftover)

    # A regenerated script invalidates any already-generated scene images
    scene_images_step = _get_step_by_name(db, project_id, "scene_images")
    if scene_images_step and scene_images_step.status == "completed":
        scene_images_step.status = "needs_refresh"

    db.commit()


def _mock_output_for_step(step_name: str, variation: int = 1) -> dict:
    if step_name == "caption":
        idx = (variation - 1) % len(MOCK_CONTENT_VARIANTS)
        return {
            "type": "content",
            "variants": MOCK_CONTENT_VARIANTS,
            "selected_index": idx,
        }
    if step_name == "trends":
        return {"type": "trends", "topics": MOCK_TRENDS}
    if step_name == "viral_dna":
        return {"type": "viral_dna", **MOCK_VIRAL_DNA}
    if step_name in ("visuals", "scene_images"):
        import random
        return {
            "type": "image",
            "images": [
                {"url": f"https://picsum.photos/seed/{random.randint(1,999)}/800/800", "composited": False}
                for _ in range(2)
            ],
            "overlay_text": MOCK_CONTENT_VARIANTS[(variation - 1) % 3]["overlay_text"],
            "variation": variation,
        }
    return {"type": step_name, "content": f"Mock content for {step_name} (variation {variation})"}
