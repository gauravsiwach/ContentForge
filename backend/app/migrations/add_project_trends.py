"""Create a project-level trend pool and backfill existing trend history safely."""

import json
import logging
import re
from datetime import datetime, timezone

from sqlalchemy import Engine, text

from app.database import engine as configured_engine

logger = logging.getLogger(__name__)
MIGRATION_VERSION = "0002_add_project_trends"


def _columns(connection, table_name: str) -> set[str]:
    return {row[1] for row in connection.exec_driver_sql(f"PRAGMA table_info({table_name})")}


def _normalize(topic: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w]+", " ", topic.casefold(), flags=re.UNICODE)).strip()


def _parse_json(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return None
    return value


def upgrade_project_trends(engine: Engine = configured_engine) -> dict[str, int]:
    """Additive, idempotent migration; existing attempts and selections are retained."""
    if engine.dialect.name != "sqlite":
        raise RuntimeError("The project trends migration currently supports SQLite only")

    trend_count = 0
    selections_backfilled = 0
    with engine.begin() as connection:
        connection.exec_driver_sql(
            """
            CREATE TABLE IF NOT EXISTS project_trends (
                id VARCHAR NOT NULL PRIMARY KEY,
                project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                topic VARCHAR NOT NULL,
                normalized_topic VARCHAR NOT NULL,
                description TEXT,
                score INTEGER,
                source VARCHAR NOT NULL DEFAULT 'generated',
                first_generated_at DATETIME,
                last_generated_at DATETIME,
                CONSTRAINT uq_project_trends_topic UNIQUE (project_id, normalized_topic)
            )
            """
        )
        if "selected_trend_id" not in _columns(connection, "posts"):
            connection.exec_driver_sql(
                "ALTER TABLE posts ADD COLUMN selected_trend_id VARCHAR "
                "REFERENCES project_trends(id) ON DELETE SET NULL"
            )
        connection.exec_driver_sql(
            "CREATE INDEX IF NOT EXISTS ix_project_trends_project_id ON project_trends(project_id)"
        )
        connection.exec_driver_sql(
            "CREATE INDEX IF NOT EXISTS ix_posts_selected_trend_id ON posts(selected_trend_id)"
        )
        connection.exec_driver_sql(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR NOT NULL PRIMARY KEY,
                applied_at DATETIME NOT NULL
            )
            """
        )

        existing: dict[tuple[str, str], dict] = {}
        step_rows = connection.execute(
            text(
                """
                SELECT project_id, post_id, input_data FROM project_steps
                WHERE step_name = 'trends'
                """
            )
        ).mappings().all()
        attempts = connection.execute(
            text(
                """
                SELECT project_steps.project_id, generation_attempts.output_data,
                       generation_attempts.created_at
                FROM generation_attempts
                JOIN project_steps ON project_steps.id = generation_attempts.step_id
                WHERE project_steps.step_name = 'trends'
                ORDER BY generation_attempts.created_at
                """
            )
        ).mappings().all()

        def add_candidate(
            project_id: str, item: dict, when: str | None, source: str = "legacy"
        ) -> None:
            nonlocal trend_count
            raw_topic = item.get("topic")
            if not isinstance(raw_topic, str) or not raw_topic.strip():
                return
            topic = raw_topic.strip()
            normalized = _normalize(topic)
            if not normalized:
                return
            timestamp = when or datetime.now(timezone.utc).isoformat()
            key = (project_id, normalized)
            candidate = existing.get(key)
            score = item.get("score")
            if not isinstance(score, (int, float)) or isinstance(score, bool):
                score = None
            else:
                score = int(score)
            description = item.get("description")
            if not isinstance(description, str):
                description = None
            if candidate is None:
                candidate = {
                    "project_id": project_id,
                    "topic": topic,
                    "normalized_topic": normalized,
                    "description": description,
                    "score": score,
                    "source": source,
                    "first_generated_at": timestamp if source != "custom" else None,
                    "last_generated_at": timestamp if source != "custom" else None,
                }
                existing[key] = candidate
            else:
                candidate["last_generated_at"] = timestamp
                if description:
                    candidate["description"] = description
                if score is not None:
                    candidate["score"] = score

        for row in attempts:
            output = _parse_json(row["output_data"]) or {}
            topics = output.get("topics", []) if isinstance(output, dict) else []
            if isinstance(topics, list):
                for item in topics:
                    if isinstance(item, dict):
                        add_candidate(row["project_id"], item, row["created_at"])

        selections: list[tuple[str, str, str]] = []
        for row in step_rows:
            input_data = _parse_json(row["input_data"]) or {}
            topic = input_data.get("selected_topic") if isinstance(input_data, dict) else None
            if isinstance(topic, str) and topic.strip():
                add_candidate(row["project_id"], {"topic": topic}, None, source="custom")
                if row["post_id"]:
                    selections.append((row["project_id"], row["post_id"], topic.strip()))

        for candidate in existing.values():
            insert_result = connection.execute(
                text(
                    """
                    INSERT OR IGNORE INTO project_trends (
                        id, project_id, topic, normalized_topic, description, score, source,
                        first_generated_at, last_generated_at
                    ) VALUES (
                        lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
                        substr(lower(hex(randomblob(2))), 2) || '-a' ||
                        substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
                        :project_id, :topic, :normalized_topic, :description, :score, :source,
                        :first_generated_at, :last_generated_at
                    )
                    """
                ),
                candidate,
            )
            trend_count += max(insert_result.rowcount, 0)

        for project_id, post_id, topic in selections:
            normalized = _normalize(topic)
            trend_id = connection.execute(
                text(
                    "SELECT id FROM project_trends "
                    "WHERE project_id = :project_id AND normalized_topic = :normalized_topic"
                ),
                {"project_id": project_id, "normalized_topic": normalized},
            ).scalar_one_or_none()
            if trend_id:
                result = connection.execute(
                    text(
                        "UPDATE posts SET selected_trend_id = :trend_id "
                        "WHERE id = :post_id AND selected_trend_id IS NULL"
                    ),
                    {"trend_id": trend_id, "post_id": post_id},
                )
                selections_backfilled += max(result.rowcount, 0)

        connection.execute(
            text(
                "INSERT OR IGNORE INTO schema_migrations(version, applied_at) "
                "VALUES (:version, :applied_at)"
            ),
            {"version": MIGRATION_VERSION, "applied_at": datetime.now(timezone.utc).isoformat()},
        )

    summary = {"trends_backfilled": trend_count, "selections_backfilled": selections_backfilled}
    logger.info("Project trends migration complete: %s", summary)
    return summary


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    upgrade_project_trends()


if __name__ == "__main__":
    main()
