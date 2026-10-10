"""Project-level trend pool operations shared by API routes and workflow steps."""

import re
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Post, ProjectTrend


def normalize_topic(topic: str) -> str:
    """Normalize punctuation and spacing so trivial text variants share one pool entry."""
    return re.sub(r"\s+", " ", re.sub(r"[^\w]+", " ", topic.casefold(), flags=re.UNICODE)).strip()


def upsert_project_trends(
    db: Session,
    project_id: str,
    topics: list[dict],
    *,
    source: str = "generated",
    generated_at: datetime | None = None,
) -> list[ProjectTrend]:
    """Append unique topic candidates to a project's pool, preserving existing selections."""
    timestamp = generated_at or datetime.now(timezone.utc)
    saved: list[ProjectTrend] = []

    for item in topics:
        raw_topic = item.get("topic")
        if not isinstance(raw_topic, str) or not raw_topic.strip():
            continue
        topic = raw_topic.strip()
        normalized = normalize_topic(topic)
        if not normalized:
            continue

        trend = (
            db.query(ProjectTrend)
            .filter(
                ProjectTrend.project_id == project_id,
                ProjectTrend.normalized_topic == normalized,
            )
            .first()
        )
        score = item.get("score")
        if isinstance(score, (int, float)) and not isinstance(score, bool):
            score = int(score)
        else:
            score = None
        description = item.get("description")
        description = description.strip() if isinstance(description, str) and description.strip() else None

        if trend is None:
            trend = ProjectTrend(
                project_id=project_id,
                topic=topic,
                normalized_topic=normalized,
                description=description,
                score=score,
                source=source,
                first_generated_at=timestamp if source != "custom" else None,
                last_generated_at=timestamp if source != "custom" else None,
            )
            db.add(trend)
        else:
            if source != "custom":
                trend.last_generated_at = timestamp
                if trend.first_generated_at is None:
                    trend.first_generated_at = timestamp
            if description:
                trend.description = description
            if score is not None:
                trend.score = score
            if trend.source == "legacy" and source == "generated":
                trend.source = source
        saved.append(trend)

    db.flush()
    return saved


def select_trend_for_post(db: Session, post: Post, trend: ProjectTrend | None) -> None:
    """Associate a post with a project trend, preventing assignment to multiple posts."""
    if trend is not None:
        if trend.project_id != post.project_id:
            raise ValueError("Trend does not belong to this project")
        other_post = (
            db.query(Post)
            .filter(
                Post.project_id == post.project_id,
                Post.selected_trend_id == trend.id,
                Post.id != post.id,
            )
            .first()
        )
        if other_post:
            raise ValueError(f"Trend is already selected by Post {other_post.post_number}")
    post.selected_trend_id = trend.id if trend else None
