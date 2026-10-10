"""Add post ownership to the existing project workflow without dropping data.

Run from the backend directory with:
    python -m app.migrations.add_posts

The operation is idempotent. Existing projects receive Post 1; category and
Viral DNA steps remain project-level, while remaining steps and scene records
are associated with that post. Generation attempts keep their existing step IDs.
"""

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import Engine, text

from app.database import engine as configured_engine

logger = logging.getLogger(__name__)

MIGRATION_VERSION = "0001_add_posts"


def _columns(connection, table_name: str) -> set[str]:
    return {row[1] for row in connection.exec_driver_sql(f"PRAGMA table_info({table_name})")}


def upgrade_posts(engine: Engine = configured_engine) -> dict[str, int]:
    """Create the posts table and backfill existing project data atomically."""
    if engine.dialect.name != "sqlite":
        raise RuntimeError("The initial posts migration currently supports SQLite only")

    projects_created = 0
    steps_attached = 0
    scenes_attached = 0

    with engine.begin() as connection:
        connection.exec_driver_sql(
            """
            CREATE TABLE IF NOT EXISTS posts (
                id VARCHAR NOT NULL PRIMARY KEY,
                project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                post_number INTEGER NOT NULL,
                current_step VARCHAR NOT NULL,
                status VARCHAR NOT NULL DEFAULT 'draft',
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                CONSTRAINT uq_posts_project_number UNIQUE (project_id, post_number)
            )
            """
        )

        for table_name in ("project_steps", "scene_items"):
            if "post_id" not in _columns(connection, table_name):
                connection.exec_driver_sql(
                    f"ALTER TABLE {table_name} ADD COLUMN post_id VARCHAR "
                    "REFERENCES posts(id) ON DELETE CASCADE"
                )

        connection.exec_driver_sql(
            "CREATE INDEX IF NOT EXISTS ix_posts_project_id ON posts(project_id)"
        )
        connection.exec_driver_sql(
            "CREATE INDEX IF NOT EXISTS ix_project_steps_post_id ON project_steps(post_id)"
        )
        connection.exec_driver_sql(
            "CREATE INDEX IF NOT EXISTS ix_scene_items_post_id ON scene_items(post_id)"
        )
        connection.exec_driver_sql(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR NOT NULL PRIMARY KEY,
                applied_at DATETIME NOT NULL
            )
            """
        )

        projects = connection.execute(
            text("SELECT id, current_step, status, created_at, updated_at FROM projects")
        ).mappings().all()
        now = datetime.now(timezone.utc).isoformat()

        for project in projects:
            post = connection.execute(
                text("SELECT id FROM posts WHERE project_id = :project_id AND post_number = 1"),
                {"project_id": project["id"]},
            ).first()
            if post:
                post_id = post[0]
            else:
                post_id = str(uuid.uuid4())
                connection.execute(
                    text(
                        """
                        INSERT INTO posts (
                            id, project_id, post_number, current_step, status, created_at, updated_at
                        ) VALUES (
                            :id, :project_id, 1, :current_step, :status, :created_at, :updated_at
                        )
                        """
                    ),
                    {
                        "id": post_id,
                        "project_id": project["id"],
                        "current_step": project["current_step"],
                        "status": project["status"],
                        "created_at": project["created_at"] or now,
                        "updated_at": project["updated_at"] or now,
                    },
                )
                projects_created += 1

            step_update = connection.execute(
                text(
                    """
                    UPDATE project_steps
                    SET post_id = :post_id
                    WHERE project_id = :project_id
                      AND post_id IS NULL
                      AND step_name NOT IN ('category', 'viral_dna')
                    """
                ),
                {"post_id": post_id, "project_id": project["id"]},
            )
            steps_attached += max(step_update.rowcount, 0)

            scene_update = connection.execute(
                text(
                    "UPDATE scene_items SET post_id = :post_id "
                    "WHERE project_id = :project_id AND post_id IS NULL"
                ),
                {"post_id": post_id, "project_id": project["id"]},
            )
            scenes_attached += max(scene_update.rowcount, 0)

        connection.exec_driver_sql(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_project_steps_shared_step
            ON project_steps(project_id, step_name)
            WHERE post_id IS NULL
            """
        )
        connection.exec_driver_sql(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_project_steps_post_step
            ON project_steps(post_id, step_name)
            WHERE post_id IS NOT NULL
            """
        )

        connection.execute(
            text(
                "INSERT OR IGNORE INTO schema_migrations(version, applied_at) "
                "VALUES (:version, :applied_at)"
            ),
            {"version": MIGRATION_VERSION, "applied_at": now},
        )

    summary = {
        "projects_created": projects_created,
        "steps_attached": steps_attached,
        "scenes_attached": scenes_attached,
    }
    logger.info("Posts migration complete: %s", summary)
    return summary


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    upgrade_posts()


if __name__ == "__main__":
    main()
