"""State machine logic for wizard step navigation."""

from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.database import SessionLocal
from app.models import Project, ProjectStep
from app.services.steps import get_steps_for_type


def reconcile_project_step_statuses(db: Session, project: Project) -> bool:
    """Align persisted statuses with inputs and successful outputs."""
    changed = False
    for post in project.posts:
        post_step_names = {step.step_name for step in post.steps}
        if post_step_names and post.current_step not in post_step_names:
            project_step = project.current_step if project.current_step in post_step_names else None
            first_post_step = min(post.steps, key=lambda step: step.step_order)
            post.current_step = project_step or first_post_step.step_name
            changed = True

    for step in project.steps:
        if step.status in ("skipped", "needs_refresh"):
            continue

        has_result = bool(step.selected_attempt_id or step.attempts)
        if step.step_name == "category" and project.category:
            has_result = True
        elif step.step_name == "viral_dna" and project.viral_dna_id:
            has_result = True
        elif step.step_name == "trends" and (step.input_data or {}).get("selected_topic"):
            has_result = True

        owner_current_step = step.post.current_step if step.post_id and step.post else project.current_step
        desired_status = (
            "completed"
            if has_result
            else "in_progress"
            if step.step_name == owner_current_step
            else "pending"
        )
        if step.status != desired_status:
            step.status = desired_status
            changed = True
    return changed


def reconcile_existing_project_steps() -> None:
    """One-time-per-startup repair for statuses written by older workflow code."""
    db = SessionLocal()
    try:
        projects = db.query(Project).all()
        changed = False
        for project in projects:
            changed = reconcile_project_step_statuses(db, project) or changed
        if changed:
            db.commit()
    finally:
        db.close()


def navigate_to_step(
    db: Session,
    project: Project,
    target_step: str,
    skip_current: bool = False,
) -> Project:
    """Navigate to a target step, applying step-back invalidation if needed."""
    step_defs = get_steps_for_type(project.type)
    step_names = [s["name"] for s in step_defs]

    if target_step not in step_names:
        raise HTTPException(status_code=400, detail=f"Invalid step '{target_step}' for project type '{project.type}'")

    target_order = next(s["order"] for s in step_defs if s["name"] == target_step)
    current_step_def = next(
        (s for s in step_defs if s["name"] == project.current_step),
        None,
    )
    current_order = next(
        (s["order"] for s in step_defs if s["name"] == project.current_step),
        1,
    )

    # Can't skip forward past the next uncompleted step
    if target_order > current_order + 1:
        # Check all steps between current and target are completed or skipped
        steps_by_name = {s.step_name: s for s in project.steps}
        for s_def in step_defs:
            if current_order < s_def["order"] < target_order:
                step = steps_by_name.get(s_def["name"])
                if step and step.status not in ("completed", "skipped"):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot skip forward to '{target_step}'. Complete or skip step '{s_def['name']}' first.",
                    )

    # Step-back: mark all downstream completed steps as needs_refresh
    if target_order < current_order:
        for step in project.steps:
            if step.step_order > target_order and step.status == "completed":
                step.status = "needs_refresh"

    # Persist the step being left. Skip is only valid for optional steps.
    if target_order > current_order:
        current_step = next(
            (step for step in project.steps if step.step_name == project.current_step),
            None,
        )
        if skip_current and not (current_step_def and current_step_def.get("optional")):
            raise HTTPException(status_code=400, detail="Only optional steps can be skipped")
        if current_step:
            current_step.status = "skipped" if skip_current else "completed"

    # Update current step
    project.current_step = target_step

    # Mark the target step as in_progress
    for step in project.steps:
        if step.step_name == target_step:
            if step.status != "completed":
                step.status = "in_progress"
            break

    db.commit()
    db.refresh(project)
    return project


def create_project_steps(db: Session, project: Project) -> list[ProjectStep]:
    """Create all steps for a project based on its type."""
    step_defs = get_steps_for_type(project.type)
    steps = []
    for i, s_def in enumerate(step_defs):
        step = ProjectStep(
            project_id=project.id,
            step_name=s_def["name"],
            step_order=s_def["order"],
            status="in_progress" if i == 0 else "pending",
        )
        db.add(step)
        steps.append(step)
    db.commit()
    for step in steps:
        db.refresh(step)
    return steps
