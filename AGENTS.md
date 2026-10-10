# ContentForge agent instructions

These instructions apply to the whole repository. Before changing code, read the relevant README and inspect the current implementation; do not assume product ideas discussed in chat are already implemented.

## Product principles

- ContentForge is local-first. Ollama provides local text and optional vision; ComfyUI with the repository's Z-Image Turbo API workflow provides local image generation. Cloud providers are optional, and normal setup must not require a paid API or API key.
- Keep user data and generated media local by default. Never commit credentials, local database contents, or generated user content.
- Generate one image per image-generation request. Do not add extra image variants or slots unless the user explicitly asks.
- The intended content model is one project containing multiple posts. Category and Viral DNA are candidates for project-level shared settings; topic, caption, image, and workflow progress belong to an individual post. This feature is a product direction, not proof the current schema supports it. Inspect the schema before implementing; do not model a new post as a duplicate project or accidentally share post-specific outputs.
- When a topic has been used by a post, preserve that association so Trends can identify the post. Refreshing trend suggestions must not erase usage history. Make intentional reuse possible unless requirements say otherwise.

## Engineering rules

- Preserve existing user changes. Inspect `git status` and the relevant diff before editing overlapping files. Avoid unrelated cleanup or broad rewrites.
- Keep configuration in the appropriate central config module and load environment-specific values from environment variables. Never scatter service base URLs, model defaults, or secrets through UI components and route handlers.
- Prefer small, single-purpose modules and reuse existing utilities/components/services. Create an abstraction when it removes real duplication or gives a meaningful reusable boundary; avoid both copy-paste logic and unnecessary generic frameworks.
- Keep frontend/backend API contracts aligned. Define validation and response shapes at the API boundary, and handle expected failures with clear user-facing messages.
- Persist workflow state in the database; do not rely on browser state as the source of truth. Commit related state changes atomically where possible, and verify persisted state after transitions.
- For schema changes, inspect existing SQLite data and startup behavior first. Provide a safe migration or idempotent upgrade path; do not delete/recreate the database or silently drop user data.
- Keep logs useful and safe: use the standard logging facility, include project/post/step identifiers, operation stages, outcomes, and durations where relevant, and log exceptions with context. Do not use print statements for runtime diagnostics or log API keys, credentials, or full private prompts/content.
- Keep changes focused. Do not change provider defaults, model choices, workflow files, or the number of generated outputs unless the request requires it.
- Update README or API documentation when setup, configuration, endpoints, or workflow behavior changes materially.

## Verification and reporting

- Run checks relevant to the changed code and report their actual results. Separate new failures from pre-existing failures; do not claim a check passed when it did not run.
- This repository has no configured test suite at present. If adding tests, follow existing project conventions; if adding a test framework or dependency, explain why.
- Summarize behavior changes, files changed, and any limitations that affect the user's next step.
