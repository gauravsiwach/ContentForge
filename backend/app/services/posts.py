"""Post lifecycle and post-scoped workflow state operations."""

import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Post, Project, ProjectStep
from app.services.steps import get_steps_for_type

logger = logging.getLogger(__name__)

# These settings are owned by the project and intentionally aren't duplicated per post.
SHARED_STEP_NAMES = {"category", "viral_dna"}


def create_post(db: Session, project: Project) -> Post:
    """Create a post and its independent workflow steps in one transaction."""
    post_number = (
        max((post.post_number for post in project.posts), default=0) + 1
    )
    definitions = [
        definition
        for definition in get_steps_for_type(project.type)
        if definition["name"] not in SHARED_STEP_NAMES
    ]
    if not definitions:
        raise HTTPException(status_code=400, detail="Project type has no post workflow steps")

    first_step = definitions[0]
    post = Post(
        project_id=project.id,
        post_number=post_number,
        current_step=first_step["name"],
        status="draft",
    )
    db.add(post)
    db.flush()

    # A completed project can be reopened by adding another independent post.
    if project.status == "completed":
        project.status = "in_progress"

    for definition in definitions:
        db.add(
            ProjectStep(
                project_id=project.id,
                post_id=post.id,
                step_name=definition["name"],
                step_order=definition["order"],
                status="in_progress" if definition is first_step else "pending",
            )
        )

    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception(
            "Post creation failed project_id=%s post_number=%s",
            project.id,
            post_number,
        )
        raise

    db.refresh(post)
    logger.info("Post created project_id=%s post_id=%s post_number=%s", project.id, post.id, post.post_number)
    return post


def navigate_post(db: Session, post: Post, target_step: str, skip_current: bool = False) -> Post:
    """Navigate within one post without changing project-shared workflow state."""
    definitions = [
        definition
        for definition in get_steps_for_type(post.project.type)
        if definition["name"] not in SHARED_STEP_NAMES
    ]
    by_name = {definition["name"]: definition for definition in definitions}
    if target_step not in by_name:
        raise HTTPException(status_code=400, detail=f"Invalid post step '{target_step}'")

    target_definition = by_name[target_step]
    current_definition = by_name.get(post.current_step)
    if not current_definition:
        raise HTTPException(status_code=409, detail="Post has an invalid current workflow step")

    target_order = target_definition["order"]
    current_order = current_definition["order"]
    steps_by_name = {step.step_name: step for step in post.steps}

    if target_order > current_order + 1:
        for definition in definitions:
            if current_order < definition["order"] < target_order:
                step = steps_by_name.get(definition["name"])
                if step and step.status not in ("completed", "skipped"):
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Cannot skip forward to '{target_step}'. Complete or skip "
                            f"'{definition['name']}' first."
                        ),
                    )

    if skip_current and target_order > current_order and not current_definition.get("optional", False):
        raise HTTPException(status_code=400, detail="Only optional steps can be skipped")

    if target_order < current_order:
        for step in post.steps:
            if step.step_order > target_order and step.status == "completed":
                step.status = "needs_refresh"

    if target_order > current_order:
        leaving_step = steps_by_name.get(post.current_step)
        if leaving_step:
            leaving_step.status = "skipped" if skip_current else "completed"

    post.current_step = target_step
    if post.status != "completed":
        post.status = "in_progress"
    target = steps_by_name.get(target_step)
    if target and target.status != "completed":
        target.status = "in_progress"

    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Post navigation failed post_id=%s target_step=%s", post.id, target_step)
        raise
    db.refresh(post)
    logger.info("Post navigated post_id=%s target_step=%s", post.id, target_step)
    return post


def complete_post(db: Session, post: Post) -> tuple[Post, str]:
    """Complete one post, and complete its parent project only when all posts are done."""
    review_step = next((step for step in post.steps if step.step_name == "review"), None)
    if not review_step:
        raise HTTPException(status_code=400, detail="Post has no review step")
    if post.current_step != "review":
        raise HTTPException(status_code=400, detail="Post can only be completed from its review step")

    unfinished_steps = [
        step.step_name
        for step in post.steps
        if step.step_order < review_step.step_order
        and step.status not in ("completed", "skipped")
    ]
    if unfinished_steps:
        raise HTTPException(
            status_code=400,
            detail=f"Complete or skip all earlier post steps before finishing: {', '.join(unfinished_steps)}",
        )

    project = post.project
    review_step.status = "completed"
    post.status = "completed"
    project.status = (
        "completed"
        if all(item.status == "completed" for item in project.posts)
        else "in_progress"
    )

    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception(
            "Post completion failed project_id=%s post_id=%s",
            project.id,
            post.id,
        )
        raise

    db.refresh(post)
    logger.info(
        "Post completed project_id=%s post_id=%s project_status=%s",
        project.id,
        post.id,
        project.status,
    )
    return post, project.status
