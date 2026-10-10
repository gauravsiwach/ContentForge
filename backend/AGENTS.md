# Backend instructions

These rules supplement the repository-level `AGENTS.md` and apply to `backend/`.

## Stack and structure

- Use Python 3.11, FastAPI, SQLAlchemy 2, Pydantic 2, and the existing `app/` layout.
- Keep route handlers in `app/routers/` focused on HTTP concerns. Put reusable workflow and persistence logic in `app/services/` or a focused domain module.
- Obtain request database sessions through `app.database.get_db`. Do not create ad hoc global sessions in request handlers.
- Define or update Pydantic schemas for API input/output. Keep frontend types and response models in sync.
- Keep app settings, database URLs, service endpoints, timeouts, and other environment-specific values in `app/config.py` (or a focused settings module) and load overrides from environment variables. Do not duplicate hardcoded URLs or configuration defaults through routers/services.
- Extract repeated domain behavior into small services/helpers with clear inputs and outputs. Keep routers thin and avoid both duplicated logic and generic abstractions that have only one trivial caller.
- Keep provider-specific HTTP details inside the existing provider/client modules; routers and workflow services should call those interfaces rather than constructing ad hoc requests.

## Logging and error handling

- Use `logging.getLogger(__name__)`; do not use `print` for runtime diagnostics. Configure log formatting and levels centrally at app startup rather than configuring handlers in individual modules.
- Log meaningful lifecycle events at service/API boundaries: operation start and completion, project/post/step identifiers, provider, elapsed time, and safe error context. Avoid logging on every trivial branch or emitting duplicate stack traces at multiple layers.
- Use `logger.exception` where an exception is caught and re-raised or translated into an HTTP error. Preserve the original cause and return a concise, actionable API error; never silently swallow exceptions.
- Never log API keys, authorization headers, credentials, full prompts, or user-generated content. Sanitize provider error messages before returning or logging them if they may contain secrets.
- Catch expected exceptions narrowly. Do not turn all failures into success-shaped fallback data or mark a step completed after a provider or persistence failure.

## Persistence and workflow state

- Use the existing project/step/status model consistently. A successful operation must persist its result and corresponding step status together where possible; failures must not leave a false `completed` state.
- Use explicit transactions and rollback-safe error handling. Avoid multiple commits for one logical state change unless there is a documented reason.
- Treat SQLite as an existing user database. Schema changes need a safe upgrade path for databases already created by the app.
- Do not perform database cleanup or direct data mutation as part of routine debugging unless the user explicitly asks.
- For the planned multi-post model, keep project-wide settings separate from post-specific workflow state and results. Persist selected trend identity/text on the post so refreshed suggestions can still be matched to posts that used them.

## Providers and external services

- Use the existing provider/configuration abstractions for Ollama, ComfyUI, and optional cloud services. Do not hardcode API keys or introduce a paid provider as a requirement.
- Keep ComfyUI workflow integration compatible with `app/workflows/z_image_turbo_api.json`; inspect node IDs, expected model files, and output behavior before changing it.
- Keep image generation to one output per request unless explicitly requested otherwise.
- Add bounded timeouts and actionable errors for network/provider calls. Log operation stages and identifiers without logging secrets or private content.

## Code quality

- Use type annotations for public functions, service boundaries, and non-trivial data structures. Keep business rules out of model serialization code and avoid circular imports.
- Validate external/provider data before persisting it. Keep HTTP status codes and error responses consistent with the existing API.
- Make state changes idempotent where practical, and keep database writes for one logical operation in one transaction.

## Backend checks

- Run Python syntax/import checks for changed modules and any relevant tests that are actually configured.
- Start the backend from `backend/` so the relative default `sqlite:///./contentforge.db` resolves to the expected local database.
