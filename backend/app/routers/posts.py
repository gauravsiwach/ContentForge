import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Post, Project, ProjectStep, ProjectTrend
from app.schemas.post import (
    PostListResponse,
    PostCompletionResponse,
    PostResponse,
    ProjectTrendResponse,
    TrendPostUsage,
    TrendSelectionRequest,
    TrendUsageResponse,
)
from app.schemas.step import NavigateRequest
from app.ai.text import generate_trends
from app.routers.settings import get_or_create_provider
from app.services.posts import complete_post, create_post, navigate_post
from app.services.trends import select_trend_for_post, upsert_project_trends

router = APIRouter(tags=["posts"])
logger = logging.getLogger(__name__)


def _get_project_or_404(db: Session, project_id: str) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _get_post_or_404(db: Session, post_id: str) -> Post:
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("/api/projects/{project_id}/posts", response_model=PostResponse, status_code=201)
def add_post(project_id: str, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    return create_post(db, project)


@router.get("/api/projects/{project_id}/posts", response_model=list[PostListResponse])
def list_posts(project_id: str, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    return (
        db.query(Post)
        .filter(Post.project_id == project.id)
        .order_by(Post.post_number)
        .all()
    )


@router.get(
    "/api/projects/{project_id}/trends/usage",
    response_model=list[TrendUsageResponse],
)
def list_trend_usage(project_id: str, db: Session = Depends(get_db)):
    """Return selected trend topics and the posts that used them."""
    _get_project_or_404(db, project_id)
    trend_steps = (
        db.query(ProjectStep)
        .join(Post, ProjectStep.post_id == Post.id)
        .filter(
            ProjectStep.project_id == project_id,
            ProjectStep.step_name == "trends",
            ProjectStep.post_id.is_not(None),
        )
        .order_by(Post.post_number)
        .all()
    )
    usage = []
    for step in trend_steps:
        topic = step.post.selected_trend.topic if step.post.selected_trend else (step.input_data or {}).get("selected_topic")
        if topic:
            usage.append(
                TrendUsageResponse(
                    topic=topic,
                    post_id=step.post_id,
                    post_number=step.post.post_number,
                    trend_id=step.post.selected_trend_id,
                )
            )
    return usage


def _serialize_project_trends(db: Session, project_id: str) -> list[ProjectTrendResponse]:
    trends = (
        db.query(ProjectTrend)
        .filter(ProjectTrend.project_id == project_id)
        .order_by(ProjectTrend.first_generated_at, ProjectTrend.topic)
        .all()
    )
    return [
        ProjectTrendResponse(
            id=trend.id,
            project_id=trend.project_id,
            topic=trend.topic,
            description=trend.description,
            score=trend.score,
            source=trend.source,
            first_generated_at=trend.first_generated_at,
            last_generated_at=trend.last_generated_at,
            used_by_posts=[
                TrendPostUsage(post_id=post.id, post_number=post.post_number)
                for post in sorted(trend.selected_by_posts, key=lambda item: item.post_number)
            ],
        )
        for trend in trends
    ]


@router.get(
    "/api/projects/{project_id}/trends",
    response_model=list[ProjectTrendResponse],
)
def list_project_trends(project_id: str, db: Session = Depends(get_db)):
    _get_project_or_404(db, project_id)
    return _serialize_project_trends(db, project_id)


@router.post(
    "/api/projects/{project_id}/trends/generate",
    response_model=list[ProjectTrendResponse],
    status_code=201,
)
async def generate_project_trends(project_id: str, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    settings = get_or_create_provider(db, "text")
    try:
        output = await generate_trends(settings, project.category or "lifestyle", project.platform or "instagram")
        topics = output.get("topics", [])
        if not isinstance(topics, list):
            raise ValueError("The text provider returned an invalid trend list")
        upsert_project_trends(db, project.id, topics)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Project trend generation failed project_id=%s", project_id)
        raise HTTPException(status_code=502, detail="Could not generate trends. Check the configured text provider and try again.") from exc
    logger.info(
        "Project trend generation completed project_id=%s provider=%s model=%s",
        project.id,
        settings.provider,
        settings.model,
    )
    return _serialize_project_trends(db, project.id)


@router.put("/api/posts/{post_id}/trend", response_model=PostResponse)
def select_post_trend(post_id: str, data: TrendSelectionRequest, db: Session = Depends(get_db)):
    post = _get_post_or_404(db, post_id)
    trend = None
    if data.trend_id:
        trend = (
            db.query(ProjectTrend)
            .filter(ProjectTrend.id == data.trend_id, ProjectTrend.project_id == post.project_id)
            .first()
        )
        if not trend:
            raise HTTPException(status_code=404, detail="Trend not found in this project")
    try:
        select_trend_for_post(db, post, trend)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    trend_step = next((step for step in post.steps if step.step_name == "trends"), None)
    if trend_step:
        input_data = dict(trend_step.input_data or {})
        if trend:
            input_data["selected_topic"] = trend.topic
            trend_step.status = "completed"
        else:
            input_data.pop("selected_topic", None)
            if not trend_step.attempts:
                trend_step.status = "pending"
        trend_step.input_data = input_data

    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Trend selection save failed post_id=%s", post_id)
        raise
    db.refresh(post)
    logger.info("Post trend selection updated post_id=%s trend_id=%s", post_id, data.trend_id)
    return post


@router.get("/api/posts/{post_id}", response_model=PostResponse)
def get_post(post_id: str, db: Session = Depends(get_db)):
    return _get_post_or_404(db, post_id)


@router.post("/api/posts/{post_id}/navigate", response_model=PostResponse)
def navigate_post_step(post_id: str, data: NavigateRequest, db: Session = Depends(get_db)):
    post = _get_post_or_404(db, post_id)
    return navigate_post(db, post, data.target_step, skip_current=data.skip_current)


@router.post("/api/posts/{post_id}/complete", response_model=PostCompletionResponse)
def complete_post_workflow(post_id: str, db: Session = Depends(get_db)):
    post = _get_post_or_404(db, post_id)
    completed_post, project_status = complete_post(db, post)
    return PostCompletionResponse(post=completed_post, project_status=project_status)
