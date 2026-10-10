# Frontend instructions

These rules supplement the repository-level `AGENTS.md` and apply to `frontend/`.

## Stack and conventions

- Use React 19, TypeScript, Vite, MUI, Zustand, React Router, and the existing Axios client.
- Keep components typed. Avoid `any`, untyped API payloads, and browser-global casts unless there is a documented need.
- Keep the frontend API base URL centralized in `src/api/client.ts`, configured through `VITE_API_URL`. Keep each feature's endpoint calls and request/response types in its `src/api/` module. Components must not call `fetch`/Axios directly or hardcode service URLs.
- Put non-API frontend configuration in a dedicated central config module if it is needed; do not duplicate defaults across components.
- Keep shared wizard/project state in `src/store/wizardStore.ts`. Do not make local component state the only source of truth for persisted workflow status.
- Build focused components with explicit prop and callback types. Extract a reusable component when it is used in multiple places or encapsulates a meaningful interaction; avoid giant components, copy-paste UI, and premature generic abstractions.
- Reuse the existing MUI theme, common layout, and shared components before introducing new styling systems or dependencies.

## Styling

- Put component-specific styles in a colocated CSS Module, for example `MyComponent.module.css`. Keep one component's selectors and layout rules out of another component's stylesheet.
- Keep global CSS limited to app-wide resets, font setup, and truly global base styles. Put shared design tokens and theme-wide MUI overrides in `src/theme/`.
- Do not grow large inline `sx` objects or style blocks in JSX. Use CSS Modules for component presentation; use `sx` only for small, genuinely dynamic values tied to component state or MUI theme values.
- Do not add a new global stylesheet or dependency just to style one component. Do not rewrite unrelated legacy styling; when modifying a component, keep its new or substantially changed styles component-scoped.
- Use semantic class names and avoid broad element selectors that can leak into other components.

## User experience

- Provide clear loading, success, empty, and error states for asynchronous operations. Disable actions only while an operation is active or when its actual prerequisites are missing, and explain unavailable actions where needed.
- Keep controls accessible: use semantic buttons and labels, keyboard-operable interactions, and meaningful image alt text.
- Do not report an operation as saved/completed until the backend confirms persistence; on failure, show an actionable message and keep UI state consistent.
- Clean up subscriptions, timers, and async effects; avoid stale updates when a component unmounts or the selected project/post changes.
- Generate one image per image-generation request unless explicitly requested otherwise.
- For the planned multi-post experience, make project-level shared settings distinct from the currently selected post. A post should have its own step progress, selected topic, caption, and image. Trends should identify posts that used a topic and allow intentional reuse.

## Frontend checks

- Use the existing scripts: `npm run build` for TypeScript plus Vite production build and `npm run lint` for Oxlint.
- Report existing TypeScript/build failures separately from errors introduced by the current change.
