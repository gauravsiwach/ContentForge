---
agent: devin-local
session: cottony-matrix
created: 2026-09-19T17:53:49Z
---
# HLD & Phase Plan: ContentForge

High-Level Design and phased implementation plan for ContentForge — with independent FE/BE testability at every phase boundary.

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                                │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │           FRONTEND — React + Vite + MUI (Dark Glassmorphism)   │  │
│  │                                                                │  │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │  │
│  │  │  Pages   │  │ Wizard   │  │ Preview  │  │  Settings    │   │  │
│  │  │ Home     │  │ Engine   │  │ Panel    │  │  Page        │   │  │
│  │  │ Projects │  │ (MUI     │  │ (MUI     │  │ (MUI Forms)  │   │  │
│  │  │          │  │ Stepper) │  │  Card)   │  │              │   │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │  │
│  │       │              │             │               │           │  │
│  │  ┌────▼──────────────▼─────────────▼───────────────▼────────┐  │  │
│  │  │              ZUSTAND STORE                                │  │  │
│  │  │  wizard-store (step, attempts) + settings-store           │  │  │
│  │  └───────────────────────┬──────────────────────────────────┘  │  │
│  └──────────────────────────┼────────────────────────────────────┘  │
│                             │  fetch / SSE (axios + EventSource)    │
└─────────────────────────────┼───────────────────────────────────────┘
                              │  http://localhost:8000/api/
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│                 BACKEND — FastAPI (Python) :8000                      │
│                                                                      │
│  ┌────────────────────┐  ┌────────────────────┐  ┌───────────────┐  │
│  │  WORKFLOW ENGINE    │  │  AI PROVIDER LAYER │  │  MEDIA LAYER  │  │
│  │  (services/)        │  │  (ai/)             │  │  (media/)     │  │
│  │                     │  │                    │  │               │  │
│  │  State Machine      │  │  ┌──────────────┐ │  │  ffmpeg-python│  │
│  │  Step Transitions   │  │  │ Text         │ │  │  Assembly     │  │
│  │  Step-Back Logic    │  │  │ (GPT/Ollama) │ │  │               │  │
│  │  Retry/Enhance      │  │  ├──────────────┤ │  │  File I/O     │  │
│  │  DNA Injector       │  │  │ Image        │ │  │  (assets)     │  │
│  │                     │  │  │ (DALL-E 3)   │ │  │               │  │
│  └─────────┬───────────┘  │  ├──────────────┤ │  └───────────────┘  │
│            │               │  │ Vision       │ │                     │
│  ┌─────────▼───────────┐  │  │ (GPT-4o Vis) │ │                     │
│  │  DATA LAYER         │  │  ├──────────────┤ │                     │
│  │                     │  │  │ Trends       │ │                     │
│  │  SQLAlchemy 2.0     │  │  │ (TrendsAPI)  │ │                     │
│  │  SQLite DB          │  │  ├──────────────┤ │                     │
│  │                     │  │  │ Viral Disc.  │ │                     │
│  │  Tables:            │  │  │ (ViralHunt)  │ │                     │
│  │  - projects         │  │  └──────────────┘ │                     │
│  │  - project_steps    │  └────────────────────┘                     │
│  │  - gen_attempts     │                                             │
│  │  - scene_items      │                                             │
│  │  - viral_dna        │                                             │
│  │  - assets           │                                             │
│  │  - provider_settings│                                             │
│  │  - categories       │                                             │
│  └─────────────────────┘                                             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Breakdown

```
FRONTEND — React + Vite + MUI (Dark Glassmorphism):
├── Pages (React Router)
│   ├── / (Home) — New Image / New Reel / Recent Projects
│   ├── /projects/:id — Wizard (main working view)
│   └── /settings — Provider configuration
│
├── Theme & Layout
│   ├── theme.ts — MUI dark glassmorphism theme:
│   │     - Canvas: #08090E with ambient purple/cyan radial gradients
│   │     - Glass cards: rgba(255,255,255,0.05) + blur(16px) + white border
│   │     - Neon glows on active/hover states (purple, cyan, green)
│   │     - MUI Paper/Card overrides with glass CSS
│   ├── glassStyles.ts — reusable glass card sx helpers
│   ├── AppLayout — Glass AppBar + Container with ambient canvas bg
│   └── AppHeader — Gradient logo text, glass nav buttons
│
├── Wizard System (reusable across Image & Reel flows)
│   ├── WizardLayout — MUI Grid 2-panel: glass step panel (60%) + glass preview (40%)
│   ├── StepProgress — MUI Stepper (gradient connector, neon glow dots)
│   ├── StepNavigator — Glass action bar: Back(glass) / Skip(text) / Retry(glass) / Enhance(glass+glow) / Accept(gradient+neon)
│   ├── AttemptBrowser — Glass ButtonGroup: ◄ 2 of 3 ► with attempt switching
│   └── EnhanceInput — Glass TextField with neon focus ring + glass Button
│
├── Step Components (pluggable into wizard)
│   ├── CategoryStep — Grid of glass Cards (neon border on selected; category only)
│   ├── ViralDnaStep — auto-discover / manual / DNA profile (nested glass cards)
│   ├── TrendsStep — Glass Chips for topics (cyan glow on selected) + glass TextField
│   ├── CaptionStep — Glass Cards for caption variants + glass Chips for hashtags
│   ├── ImageStep — Glass ImageList + glass Select for style presets (neon border on selected)
│   ├── ScriptStep (reel only) — Glass Cards with editable TextFields per scene
│   ├── SceneImagesStep (reel only) — Grid of glass SceneCards with neon borders
│   ├── AudioStep (reel only) — Glass Switch (TTS) + glass List (music picker)
│   ├── AssemblyStep (reel only) — video player in glass Card + glass Select
│   └── ReviewStep — final preview (glass Card) + gradient export buttons with neon glow
│
├── Shared Components
│   ├── DnaProfile / DnaEditor — Nested glass Card with neon color swatches + inline edit
│   ├── SceneCard / SceneGrid — Glass Card + Grid, per-scene glow-on-hover controls
│   ├── ImagePreview / ReelPreview — Glass Card right panel (elevated blur)
│   ├── ProviderForm — Glass TextField + Switch + Button for settings
│   └── GenerationLoader — Glass Skeleton with wave animation + neon pulse
│
├── API Client (api/)
│   ├── client.ts — axios instance pointing to FastAPI :8000
│   └── *.ts — typed API functions per resource
│
└── Store (Zustand)
    └── wizardStore.ts — step state, attempts, project data

BACKEND — FastAPI (Python):
├── Routers (app/routers/) — REST + SSE endpoints
│   ├── projects.py — CRUD + navigation
│   ├── steps.py — generate (SSE), retry, select, attempts
│   ├── scenes.py — per-scene generation
│   ├── viral_dna.py — auto, manual, get, edit
│   ├── assembly.py — FFmpeg assembly trigger
│   ├── export.py — file export
│   ├── trends.py — TrendsAPI proxy
│   ├── categories.py — category list
│   └── settings.py — provider config CRUD
│
├── Services (app/services/) — Workflow Engine
│   ├── workflow.py — state machine, step transitions, invalidation
│   ├── retry.py — build retry/enhance prompts from attempt history
│   └── steps.py — step configs per flow type (image vs reel)
│
├── AI Provider Layer (app/ai/)
│   ├── provider.py — factory: OpenAI + Ollama unified client
│   ├── text.py — caption, script generation (openai SDK)
│   ├── image.py — DALL-E 3 generation (openai SDK)
│   ├── vision.py — GPT-4o Vision (DNA analysis)
│   └── trends.py — TrendsAPI integration (httpx)
│
├── Viral DNA (app/viral_dna/)
│   ├── discover.py — auto-discover viral content (httpx + search APIs)
│   ├── analyzer.py — Vision AI analysis orchestration
│   └── injector.py — inject DNA attributes into prompts
│
├── Media (app/media/)
│   ├── ffmpeg_assembler.py — Ken Burns + transitions + captions + audio mix
│   └── tts.py — TTS wrapper (gTTS / pyttsx3)
│
├── Models (app/models/) — SQLAlchemy ORM models
│   └── *.py — one per table
│
├── Schemas (app/schemas/) — Pydantic request/response
│   └── *.py — one per resource
│
└── Data Layer
    ├── database.py — SQLAlchemy engine + async session
    └── seed.py — category seed data
```

---

## 3. Data Flow Diagrams

### 3a. Image Creation — End-to-End

```
User clicks "New Image"
  │
  ▼
POST /api/projects {type:'image', category, platform, format}
  │ → Creates project + 6 project_steps (pending)
  │ → Returns project with steps
  ▼
[Step 1: Category] — pure FE, user picks → saved via PUT /api/projects/:id/steps/category
  │
  ▼
[Step 2: Viral DNA] — user clicks "Auto-discover"
  POST /api/projects/:id/viral-dna/auto {category}
  │ → Discover: search viral content → fetch thumbnails
  │ → Analyze: GPT-4o Vision on thumbnails → extract DNA JSON
  │ → Store: INSERT viral_dna_profiles → link to project
  │ → Return: DNA profile
  ▼
[Step 3: Trends] — user clicks "Fetch Trends"
  GET /api/trends?category=fitness
  │ → TrendsAPI call → return trending topics
  │ → User picks topic → PUT /api/projects/:id/steps/trends
  ▼
[Step 4: Content] — user clicks "Generate"
  POST /api/projects/:id/steps/caption/generate
  │ → Build prompt (topic + category + DNA injection)
  │ → GPT-4o → return 3 content variants, each with:
  │     overlay_text  — punchy quote/hook rendered ON the image (max ~10 words)
  │     feed_caption  — longer feed text with emojis + CTA
  │     hashtags      — 8-15 tags
  │ → INSERT generation_attempts (attempt #1)
  │ → User clicks "Enhance & Retry" → POST /retry {enhancement: "make overlay punchier"}
  │   → INSERT generation_attempts (attempt #2)
  │ → User browses attempts ◄ 1/2 ► → edits inline → picks one → PUT /select
  │   NOTE: Nothing visual is generated until user approves content here
  ▼
[Step 5: Image] — user clicks "Generate" (only after content approved)
  POST /api/projects/:id/steps/visuals/generate
  │ → Reads approved overlay_text + feed_caption from selected attempt
  │ → Build DALL-E prompt (topic + overlay_text + DNA colors/style) — "no text on image"
  │ → DALL-E 3 → clean background PNG saved to disk
  │ → Pillow composites overlay_text onto background:
  │     font: bold sans-serif, auto-sized to image width
  │     color: contrast-safe (white/black against DNA primary color)
  │     position: center or lower-third from DNA composition
  │ → INSERT generation_attempts + INSERT generated_assets (composited PNG)
  │ → User sees FINAL image with text — exactly what will be posted
  │ → Retry/enhance same pattern (retries both background + composite)
  ▼
[Step 6: Review + Export]
  POST /api/projects/:id/export
  │ → Platform + Format selectors (Instagram/Facebook/YouTube + aspect ratio)
  │ → Preview: composited image + feed_caption + hashtags
  │ → Return: final PNG file + feed_caption + hashtags text
```

### 3b. Reel Creation — End-to-End

```
Steps 1-3: Same as Image flow (category, DNA, trends)
  │
  ▼
[Step 4: Script]
  POST /api/projects/:id/steps/script/generate
  │ → GPT-4o → JSON {scenes: [{narration, visual_desc, caption_overlay, duration}]}
  │ → INSERT generation_attempts + INSERT scene_items (one per scene)
  │ → User edits scenes inline → PUT /api/projects/:id/steps/script
  ▼
[Step 5: Scene Images]
  POST /api/projects/:id/scenes/generate-all
  │ → For each scene_item:
  │   → Build DALL-E prompt from visual_desc + DNA
  │   → DALL-E 3 → INSERT generated_assets
  │   → UPDATE scene_items.image_asset_id
  │ → Per-scene retry: POST /api/projects/:id/scenes/:sceneId/retry
  ▼
[Step 6: Audio]
  POST /api/projects/:id/steps/audio/generate
  │ → TTS: narration text → voiceover audio file
  │ → User picks background music track
  │ → INSERT generated_assets (voiceover + music selection)
  ▼
[Step 7: Assembly]
  POST /api/projects/:id/assemble
  │ → FFmpeg pipeline:
  │   1. Each scene image → Ken Burns video clip
  │   2. Concatenate with xfade transitions
  │   3. Add caption overlays (drawtext)
  │   4. Mix voiceover + music (amix)
  │ → Output: MP4 → INSERT generated_assets (final_video)
  │ → Return: video URL for preview
  ▼
[Step 8: Export]
  POST /api/projects/:id/export
  │ → Return: MP4 file + caption text + hashtags
```

### 3c. Retry/Enhance Flow

```
User on ANY AI step:

  [Retry ↻]
    POST /api/projects/:id/steps/:step/retry
    Body: {}
    │ → Fetch previous attempt's prompt
    │ → Re-send same prompt to AI (temperature variation = different output)
    │ → INSERT generation_attempts (attempt_number + 1)
    │ → Return new output

  [Enhance & Retry ✏️↻]
    POST /api/projects/:id/steps/:step/retry
    Body: { enhancement: "make it punchier" }
    │ → Fetch previous attempt's prompt + output
    │ → Build enhanced prompt: original + "Improve based on: {enhancement}"
    │ → Send to AI
    │ → INSERT generation_attempts (with enhancement text stored)
    │ → Return new output

  [Browse Attempts ◄ 2/3 ►]
    GET /api/projects/:id/steps/:step/attempts
    │ → Return all attempts for this step (ordered by attempt_number)

  [Select Attempt]
    PUT /api/projects/:id/steps/:step/select
    Body: { attempt_id: "..." }
    │ → UPDATE project_steps.selected_attempt_id
    │ → UPDATE generation_attempts.is_selected
```

### 3d. Step-Back Flow

```
User on Step 5 clicks Step 3 in progress bar:

  POST /api/projects/:id/navigate
  Body: { target_step: "trends" }
  │
  │ → Validate: target is a previous completed step
  │ → UPDATE project.current_step = "trends"
  │ → UPDATE project_steps WHERE step_order > 3:
  │     status = 'needs_refresh'
  │ → Return: project with updated step states
  │
  ▼
  FE loads Step 3 with its saved data (selected attempt still there)
  User makes changes → generates new output → accepts
  │
  ▼
  Navigate forward: each downstream step shows "needs refresh" badge
  User must re-generate (or accept existing output) at each step
```

---

## 4. Entity Relationship

```
projects ──1:N── project_steps ──1:N── generation_attempts
    │                  │
    │                  └──1:N── scene_items (reels only)
    │
    ├──1:1── viral_dna_profiles
    │
    └──1:N── generated_assets

provider_settings (global config, not per-project)
categories (seed data)
```

---

## 5. Key Technical Decisions

| Decision | Choice | Why |
|---|---|---|
| Separate FE/BE | **React (Vite) + FastAPI (Python)** | Python is native to AI/ML ecosystem; React stays lightweight |
| Backend framework | **FastAPI** | Async, auto-docs (Swagger UI), Pydantic validation, SSE support |
| Frontend UI library | **MUI (Material UI v6)** | Rich component library (Stepper, Cards, etc.), built-in dark theme, fast MVP |
| DB | **SQLite + SQLAlchemy 2.0** | Zero-config, file-based, Pythonic ORM with async support |
| Video assembly | **FFmpeg** (`ffmpeg-python`) | Pythonic wrapper, Ken Burns + transitions + captions |
| AI SDK | **OpenAI Python SDK** + LangChain | Native Ollama-compatible, streaming, function calling |
| State management | **Zustand** | Lightweight, no boilerplate |
| Streaming | **SSE** via FastAPI `StreamingResponse` | Native async generator support |
| API structure | **REST + SSE** (not GraphQL) | Simpler for CRUD + streaming, no over-engineering |
| FE ↔ BE communication | **axios + Pydantic schemas** | Typed contracts, CORS handled by FastAPI middleware |

---

## 6. Phased Implementation Plan

### Design Principle: FE & BE Independently Testable

Each phase is designed so that:
- **BE is testable with curl/Swagger** — FastAPI endpoints return real data, Swagger UI at `/docs` for interactive testing
- **FE is testable with mock data** — MUI components render and are interactive even before BE is wired up
- **Integration test** at end of each phase — React FE calls FastAPI BE, full flow works end-to-end

```
Phase structure:
  ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
  │  FastAPI BE   │     │  React FE     │     │ Integration  │
  │  + pytest     │ ──► │  + MUI mocks  │ ──► │ FE ↔ BE      │
  │  (curl/Swagger)│     │ (visual)     │     │ E2E test     │
  └──────────────┘     └──────────────┘     └─────────────┘
```

---

### PHASE 1: Skeleton — Project + Wizard Shell (Days 1-3)

**Goal**: You can create a project, see the wizard, navigate steps — all persisted in DB. No AI yet.

#### BE Work (FastAPI + Python)

| # | Task | Files | Test (curl) |
|---|---|---|---|
| 1 | Project setup: FastAPI + SQLAlchemy + SQLite + uvicorn | `requirements.txt`, `app/main.py`, `app/config.py`, `app/database.py` | `uvicorn app.main:app --reload` starts, Swagger at `/docs` |
| 2 | Full DB schema (SQLAlchemy models) + auto-create | `app/models/*.py` | Tables auto-created on startup |
| 3 | Pydantic schemas for request/response | `app/schemas/*.py` | — |
| 4 | Seed categories | `app/seed.py` | `python -m app.seed` → categories in DB |
| 5 | Project CRUD APIs | `app/routers/projects.py` | `curl POST /api/projects` → creates project + steps |
|   | | | `curl GET /api/projects` → lists projects |
|   | | | `curl GET /api/projects/:id` → returns project + steps |
|   | | | `curl DELETE /api/projects/:id` → deletes |
| 6 | Categories API | `app/routers/categories.py` | `curl GET /api/categories` → returns seeded categories |
| 7 | Step navigation API | `app/routers/steps.py` (navigate endpoint) | `curl POST /navigate {target:'trends'}` → updates current_step, marks downstream needs_refresh |
| 8 | State machine logic | `app/services/workflow.py`, `app/services/steps.py` | Unit test (pytest): step transitions, step-back invalidation |
| 9 | CORS middleware | `app/main.py` | FE on :5173 can call BE on :8000 |

**BE Validation Checklist:**
```
□ POST /api/projects {type:'image'} → 201, returns project with 6 steps
□ POST /api/projects {type:'reel'}  → 201, returns project with 8 steps
□ GET /api/projects                 → 200, lists all projects
□ GET /api/projects/:id             → 200, full project with steps
□ DELETE /api/projects/:id          → 200, deleted
□ GET /api/categories               → 200, returns category list
□ POST /api/projects/:id/navigate {target_step:'trends'} → 200, step states updated
□ POST /api/projects/:id/navigate {target_step:'review'} → 400, can't skip forward
```

#### FE Work (React + Vite + MUI — Dark Glassmorphism)

| # | Task | Files | Test (visual) |
|---|---|---|---|
| 1 | Project setup: Vite + React + MUI + React Router + Zustand + axios | `package.json`, `vite.config.ts` | `npm run dev` starts on :5173 |
| 2 | MUI glassmorphism theme — dark canvas + glass overrides + neon glows | `src/theme.ts` | Canvas: #08090E with ambient purple/cyan radial washes |
| 3 | Glass card reusable styles (sx helpers) | `src/theme/glassStyles.ts` | `.glass-card` renders with blur, transparent bg, white border |
| 4 | App shell — MUI ThemeProvider + CssBaseline + Router | `src/App.tsx`, `src/main.tsx` | Glassmorphism theme applied globally, ambient canvas bg visible |
| 5 | AppLayout + AppHeader — Glass AppBar with gradient logo + glass nav buttons | `src/components/layout/AppLayout.tsx`, `AppHeader.tsx` | Frosted glass header bar, gradient "ContentForge" text |
| 6 | Home page — Glass Cards for New Image / New Reel + project list | `src/pages/HomePage.tsx` | Glass cards with neon glow on hover, empty project list |
| 7 | Zustand wizard store | `src/store/wizardStore.ts` | Store tracks currentStep, projectId |
| 8 | WizardLayout — 2-panel glass shell (60% + 40%) | `src/components/wizard/WizardLayout.tsx` | Two glass Card panels side by side on ambient canvas |
| 9 | StepProgress — MUI Stepper (gradient connector, neon glow dots) | `src/components/wizard/StepProgress.tsx` | Gradient track, green glow on done, purple glow on active, glass dots for pending |
| 10 | StepNavigator — Glass action bar (Back/Skip/Accept) | `src/components/wizard/StepNavigator.tsx` | Glass bar at bottom: glass buttons + gradient Accept with neon glow |
| 11 | CategoryStep — Grid of glass Cards (category only) | `src/components/steps/CategoryStep.tsx` | Glass category cards, neon purple border on selected. Platform + Format moved to ReviewStep |
| 12 | Placeholder steps (glass Card shells for each step) | `src/components/steps/*.tsx` | Navigate through all 6/8 steps, each shows glass card with Skeleton |
| 13 | Project page — loads wizard for project ID | `src/pages/ProjectPage.tsx` | URL `/projects/abc` shows glassmorphism wizard |
| 14 | API client setup | `src/api/client.ts` | axios instance pointing to :8000 |

**FE Validation Checklist (mock data, no BE):**
```
□ Canvas background: #08090E with visible ambient purple + cyan radial washes
□ Glass cards render: semi-transparent bg, blur effect, subtle white border, inset highlight
□ Home page: glass "New Image" / "New Reel" cards with neon glow on hover
□ Clicking "New Image" → wizard with 6-step MUI Stepper (glassmorphism dots)
□ Clicking "New Reel" → wizard with 8-step MUI Stepper
□ Stepper: gradient connector track fills as steps complete
□ Stepper: green neon glow on completed dots, purple neon glow on active dot
□ CategoryStep: glass Card grid, selected card has purple neon border
□ Progress bar: clicking a step navigates to it (non-linear stepper)
□ StepNavigator: glass action bar — Back(glass), Accept(gradient with neon glow)
□ Placeholder steps render with glass card + MUI Skeleton wave
□ Two-panel layout: glass step panel (60%) + glass preview panel (40%)
□ Glass header bar: frosted blur, gradient logo text, glass nav buttons
□ Neon focus rings: clicking into any TextField shows purple glow border
```

#### Integration Test

```
□ Click "New Image" → POST /api/projects → redirects to /projects/:id
□ Wizard loads with correct 6 steps from DB
□ Navigate forward/backward → DB updates current_step
□ CategoryStep saves selection → PUT updates project
□ Step-back from step 4 to step 2 → steps 3-4 marked 'needs_refresh' in DB
```

---

### PHASE 2: Settings + Provider Layer + Retry UI (Days 4-6)

**Goal**: Provider configuration works, retry/enhance UI is interactive, mock AI returns data.

#### BE Work (FastAPI)

| # | Task | Files | Test (curl) |
|---|---|---|---|
| 1 | Provider settings CRUD API | `app/routers/settings.py`, `app/schemas/provider.py` | `curl GET /api/settings/providers` → returns defaults |
|   | | | `curl PUT /api/settings/providers/text {provider:'openai', model:'gpt-4o', api_key:'sk-...'}` → saves |
| 2 | Provider factory (OpenAI + Ollama) | `app/ai/provider.py` | Unit test (pytest): creates OpenAI client with correct base_url |
| 3 | Provider test connection API | `app/routers/settings.py` (test endpoint) | `curl POST /api/settings/providers/text/test` → 200 or error |
| 4 | Attempt CRUD | `app/routers/steps.py` (attempts endpoints) | `curl GET /attempts` → returns attempt list |
| 5 | Select attempt API | `app/routers/steps.py` (select endpoint) | `curl PUT /select {attempt_id:'...'}` → marks selected |
| 6 | Generate API (mock — returns hardcoded data) | `app/routers/steps.py` (generate endpoint) | `curl POST /generate` → returns mock caption JSON |
| 7 | Retry API (mock) | `app/routers/steps.py` (retry endpoint) | `curl POST /retry {enhancement:'shorter'}` → returns mock + stores attempt |

**BE Validation Checklist:**
```
□ GET /api/settings/providers             → default provider configs
□ PUT /api/settings/providers/text {...}  → saves, returns updated
□ POST /api/settings/providers/text/test  → tests connection (200 or error msg)
□ POST /generate (mock)                   → returns mock data + creates attempt in DB
□ POST /retry {}                          → creates attempt #2 in DB
□ POST /retry {enhancement:'shorter'}     → creates attempt #3 with enhancement stored
□ GET /attempts                           → returns all 3 attempts
□ PUT /select {attempt_id}                → marks attempt as selected
```

#### FE Work (React + MUI)

| # | Task | Files | Test (visual) |
|---|---|---|---|
| 1 | Settings page — Glass Cards per provider type with glass TextFields | `src/pages/SettingsPage.tsx`, `src/components/settings/ProviderForm.tsx` | Glass cards for each provider, toggle cloud/local (glass Switch), neon focus on TextFields |
| 2 | Connection test button + status indicator | `src/components/settings/ProviderForm.tsx` | Glass Button "Test" → green neon glow on success, red on error |
| 3 | AttemptBrowser — Glass ButtonGroup ◄ 2/3 ► | `src/components/wizard/AttemptBrowser.tsx` | Glass IconButtons with subtle glow, attempt number display |
| 4 | EnhanceInput — Glass TextField (neon focus ring) + glass Button | `src/components/wizard/EnhanceInput.tsx` | Type feedback, click "Enhance & Retry" (glass button with purple glow) |
| 5 | StepNavigator updated — Retry + Enhance buttons | `src/components/wizard/StepNavigator.tsx` | All 5 glass buttons: Back(glass)/Skip(text)/Retry(glass)/Enhance(glass+glow)/Accept(gradient+neon) |
| 6 | Loading/streaming skeleton for AI generation | `src/components/wizard/GenerationLoader.tsx` | Glass Skeleton with wave animation + neon pulse border while "generating" |

**FE Validation Checklist (mock data):**
```
□ Settings page: glass Cards for text/image/vision providers on ambient canvas
□ Cloud mode: glass TextField with neon purple focus ring for API key
□ Local mode: glass TextField for Ollama URL + glass Select for model
□ "Test Connection" glass Button → CircularProgress → green/red neon glow result
□ AttemptBrowser: glass ◄ 1/3 ► → clicking glass arrows cycles through mock attempts
□ EnhanceInput: glass TextField (purple glow on focus) + "Enhance & Retry" glass button
□ StepNavigator: all 5 action buttons render as glass/gradient with neon effects
□ GenerationLoader: glass Skeleton with wave animation + subtle neon pulse
```

#### Integration Test

```
□ Settings page → PUT /api/settings/providers → saves to DB → reloads correctly
□ Test connection → POST /test → shows real success/error
□ CaptionStep: click "Generate" → POST /generate → mock data renders in UI
□ Click "Retry" → POST /retry → new attempt in AttemptBrowser (now 2/2)
□ Click "Enhance & Retry" with text → POST /retry {enhancement} → attempt 3/3
□ Browse attempts → click attempt 1 → PUT /select → UI shows attempt 1 content
```

---

### PHASE 3: Image Flow — Real AI (Days 7-11)

**Goal**: Complete image creation works end-to-end with real OpenAI calls.

#### BE Work (FastAPI)

| # | Task | Files | Test (curl) |
|---|---|---|---|
| 1 | Trends API integration | `app/ai/trends.py`, `app/routers/trends.py` | `curl GET /api/trends?category=fitness` → returns real trending topics |
| 2 | Viral DNA auto-discover | `app/viral_dna/discover.py` | Unit test (pytest): search query → returns image URLs |
| 3 | Viral DNA Vision analysis | `app/viral_dna/analyzer.py`, `app/ai/vision.py` | `curl POST /viral-dna/auto {category:'fitness'}` → returns DNA JSON |
| 4 | Viral DNA manual (URL + upload) | `app/routers/viral_dna.py` | `curl POST /viral-dna/manual {url:'...'}` → returns DNA |
| 5 | Viral DNA CRUD (get, edit) | `app/routers/viral_dna.py` | `curl GET/PUT /viral-dna` |
| 6 | DNA injector | `app/viral_dna/injector.py` | Unit test (pytest): inject_dna(base_prompt, dna_profile) → enhanced prompt |
| 7 | Caption generation (real GPT-4o, SSE) | `app/ai/text.py`, update steps router | `curl POST /steps/caption/generate` → SSE stream of caption JSON |
| 8 | Image generation (real DALL-E 3) | `app/ai/image.py`, update steps router | `curl POST /steps/visuals/generate` → returns image URLs + saves assets |
| 9 | Retry with real AI | update steps router | `curl POST /retry {enhancement:'more emoji'}` → real AI re-generation |
| 10 | Export image | `app/routers/export.py` | `curl POST /export` → returns PNG file path |

**BE Validation Checklist:**
```
□ GET /api/trends?category=fitness          → real TrendsAPI data
□ POST /viral-dna/auto {category:'fitness'} → discovers posts, analyzes, returns DNA JSON
□ POST /viral-dna/manual {url:'...'}        → fetches image, analyzes, returns DNA
□ GET /viral-dna                            → returns saved DNA profile
□ PUT /viral-dna {dna_data: edited}         → saves edits
□ POST /steps/caption/generate              → SSE stream, 3 captions + hashtags (real GPT-4o)
□ POST /steps/caption/retry {enh:'shorter'} → new attempt with enhanced output
□ POST /steps/visuals/generate              → DALL-E 3 images saved to disk + DB
□ POST /steps/visuals/retry {enh:'brighter'}→ new images
□ POST /export                              → PNG file + caption text
```

#### FE Work (React + MUI — Glassmorphism)

| # | Task | Files | Test (visual) |
|---|---|---|---|
| 1 | ViralDnaStep — 3 glass Buttons (Auto/URL/Upload) + nested glass DNA card | `src/components/steps/ViralDnaStep.tsx` | Glass buttons with neon glow hover, nested glass DNA profile card |
| 2 | DnaProfile — neon color swatches + glass Chip attributes | `src/components/viral-dna/DnaProfile.tsx` | Circular color swatches with glow, style/mood/hook/CTA as glass Chips |
| 3 | DnaEditor — glass TextField inline edit with neon focus | `src/components/viral-dna/DnaEditor.tsx` | Click "Edit" → glass TextFields with purple focus glow |
| 4 | TrendsStep — glass Chips for topics + glass TextField | `src/components/steps/TrendsStep.tsx` | Glass Chips, selected gets cyan neon border, glass custom TextField |
| 5 | ContentStep — 3 glass Cards each showing overlay_text + feed_caption + hashtag Chips | `src/components/steps/ContentStep.tsx` | Card header = overlay_text (big bold), body = feed_caption, footer = hashtag Chips. Selected card gets neon purple border. Inline edit on both text fields. |
| 6 | ImageStep — glass ImageList (composited final images) + glass Select for style presets | `src/components/steps/ImageStep.tsx` | Images in glass grid show final composited image (background + overlay text). Selected gets neon glow border. glass Select for style preset. |
| 7 | ReviewStep — Platform + Format selects + glass Card preview + gradient+neon export buttons | `src/components/steps/ReviewStep.tsx` | Glass Select for Platform (Instagram/Facebook/YouTube) + Format (aspect ratio), glass preview Card, gradient "Download"/"Copy" buttons with neon glow |
| 8 | ImagePreview — glass Card right panel | `src/components/preview/ImagePreview.tsx` | Shows selected image + caption in elevated glass Card |
| 9 | SSE streaming hook — EventSource + word-by-word render | `src/hooks/useGenerate.ts` | Text streams in with glass LinearProgress + neon pulse |

**FE Validation Checklist (mock data for pure FE, then real):**
```
□ ViralDnaStep: glass "Auto-discover" button → neon pulse loading → glass DNA card renders
□ DnaProfile: color swatches display as neon-glowing circles with hex codes
□ DnaEditor: edit mood → glass TextField with purple focus ring → save → profile updates
□ TrendsStep: glass Chips, selected gets cyan neon border, glass custom TextField works
□ ContentStep: 3 glass Cards each showing overlay_text (large bold) + feed_caption + hashtag Chips
□ ContentStep: selected card gets purple neon border + glow
□ ContentStep: inline edit overlay_text → updates card header in real time
□ ContentStep: inline edit feed_caption → updates card body in real time
□ ContentStep: approve one variant → image step becomes available
□ ImageStep: glass grid shows composited images (background + overlay_text rendered on it)
□ ImageStep: glass Select for style presets (minimal, bold, cinematic)
□ ImageStep: selected image gets neon glow border + preview panel updates
□ ReviewStep: glass Card with image + caption + hashtag Chips
□ ReviewStep: gradient+neon "Download" and "Copy Caption" buttons work
□ SSE streaming: text appears word by word with glass LinearProgress + neon fill
```

#### Integration Test — FULL IMAGE FLOW E2E

```
□ New Image → pick Fitness + IG Post
□ Viral DNA: Auto-discover → real viral content found → DNA profile shown
□ Edit DNA: change mood to "energetic" → saved
□ Trends: real fitness trends shown → pick one
□ Caption: Generate → GPT-4o streams 3 captions → pick one → edit hashtags
□ Caption: Enhance & Retry "more emoji" → new captions → browse attempts → pick
□ Image: Generate → DALL-E 3 returns 2-4 images → pick one
□ Image: Retry → different images → browse attempts
□ Review: shows image + caption + hashtags preview
□ Export: download PNG → verify file. Copy caption → clipboard works.
□ Step-back: go to Trends → pick different topic → Caption shows "needs refresh"
□ Re-generate caption → new captions based on new topic
```

---

### PHASE 4: Reel Flow — Script + Scene Images (Days 12-16)

**Goal**: Script generation and per-scene image generation work with retry. No video/audio yet — just the data pipeline.

#### BE Work (FastAPI)

| # | Task | Files | Test (curl) |
|---|---|---|---|
| 1 | Script generation (GPT-4o → scenes JSON) | update `app/ai/text.py`, steps router | `curl POST /steps/script/generate` → JSON with 4 scenes |
| 2 | Scene items creation from script | `app/routers/scenes.py`, models | After script generate → scene_items table has 4 rows |
| 3 | Script inline edit (save modified scenes) | `app/routers/steps.py` | `curl PUT /steps/script {scenes: [...edited]}` → updates scene_items |
| 4 | Generate all scene images | `app/routers/scenes.py` | `curl POST /scenes/generate-all` → 4 DALL-E calls → 4 images saved |
| 5 | Generate single scene image | `app/routers/scenes.py` | `curl POST /scenes/:id/generate-image` → 1 image |
| 6 | Retry scene image | `app/routers/scenes.py` | `curl POST /scenes/:id/retry {enhancement:'brighter'}` → new image |
| 7 | Scene-to-step dependency logic | `app/services/workflow.py` | Script change → scene_images invalidated |

**BE Validation Checklist:**
```
□ POST /steps/script/generate             → JSON: 4 scenes with narration, visual_desc, duration
□ DB: scene_items has 4 rows after generate
□ PUT /steps/script {scenes:[...edited]}  → scene_items updated
□ POST /scenes/generate-all               → 4 images in generated_assets, scene_items.image_asset_id linked
□ POST /scenes/:id/generate-image         → 1 image for specific scene
□ POST /scenes/:id/retry {enh:'darker'}   → new image, attempt stored
□ Step-back to script → scene_images status = 'needs_refresh'
```

#### FE Work (React + MUI — Glassmorphism)

| # | Task | Files | Test (visual) |
|---|---|---|---|
| 1 | ScriptStep — Glass Cards per scene with glass TextFields (narration + visual desc + duration) | `src/components/steps/ScriptStep.tsx` | 4 glass Cards, each with glass TextFields + neon focus ring |
| 2 | ScriptStep — add/remove/reorder scenes | `ScriptStep.tsx` | Glass IconButton "Add Scene" with glow, drag to reorder, delete with red glow |
| 3 | SceneImagesStep — Grid of glass scene image cards | `src/components/steps/SceneImagesStep.tsx` | 4-card glass Grid, each with image + glass retry buttons |
| 4 | SceneCard — Glass Card with image + per-scene glass retry/enhance | `src/components/scenes/SceneCard.tsx` | Image in glass Card + glass IconButtons with neon glow on hover |
| 5 | SceneGrid — MUI Grid responsive layout | `src/components/scenes/SceneGrid.tsx` | 2x2 glass Grid on desktop, 1-col on mobile |
| 6 | "Generate All" + "Retry All" gradient+neon buttons | `SceneImagesStep.tsx` | Gradient buttons with neon glow above glass grid |

**FE Validation Checklist (mock data):**
```
□ ScriptStep: 4 glass Cards render on ambient canvas with glass TextFields
□ ScriptStep: edit narration → glass TextField with neon focus ring → saves
□ ScriptStep: add scene → 5th glass card appears. Delete → 3 cards.
□ SceneImagesStep: 4 glass Cards with mock images on ambient canvas
□ SceneCard: per-scene glass Retry + Enhance IconButtons with neon glow tooltips
□ SceneCard: enhance → glass TextField appears with purple focus → type → submit
□ "Generate All" → glass Skeleton wave loading on all 4 cards simultaneously
□ "Retry All" → glass Skeleton re-loading on all 4
```

#### Integration Test

```
□ New Reel → category + platform + duration picked
□ (optional) Viral DNA → DNA profile extracted
□ (optional) Trends → topic picked
□ Script: Generate → 4 scenes from GPT-4o → edit scene 2 narration → save
□ Script: Retry full → new 4 scenes → browse attempts → pick attempt 1
□ Scene Images: Generate All → 4 DALL-E images render in grid
□ Scene Images: Retry scene 3 with "more dramatic" → new image for scene 3 only
□ Scene Images: Browse scene 3 attempts → pick original → image reverts
□ Step-back to Script → scene images show "needs refresh"
```

---

### PHASE 5: Reel Flow — Audio + FFmpeg Assembly + Export (Days 17-22)

**Goal**: Full reel creation works end-to-end. You get an MP4 out.

#### BE Work (FastAPI)

| # | Task | Files | Test (curl) |
|---|---|---|---|
| 1 | TTS voiceover generation (gTTS / pyttsx3) | `app/media/tts.py`, steps router | `curl POST /steps/audio/generate` → voiceover file created |
| 2 | Music track listing | steps router | `curl GET /steps/audio/music-tracks` → list of bundled tracks |
| 3 | FFmpeg assembly: Ken Burns | `app/media/ffmpeg_assembler.py` | Unit test (pytest): image → 5s zoompan video clip |
| 4 | FFmpeg assembly: transitions | `app/media/ffmpeg_assembler.py` | Unit test: 2 clips → xfade concatenation |
| 5 | FFmpeg assembly: caption overlays | `app/media/ffmpeg_assembler.py` | Unit test: video + drawtext → captions visible |
| 6 | FFmpeg assembly: audio mix | `app/media/ffmpeg_assembler.py` | Unit test: video + voiceover + music → mixed audio |
| 7 | Full assembly pipeline | `app/routers/assembly.py` | `curl POST /assemble` → MP4 file created |
| 8 | Reel export | `app/routers/export.py` | `curl POST /export` → MP4 file path + caption text |

**BE Validation Checklist:**
```
□ POST /steps/audio/generate {narrations:[...]}  → voiceover WAV/MP3 file
□ POST /assemble {transition:'fade'}             → MP4 file with Ken Burns + transitions + captions + audio
□ MP4 validation: correct duration (sum of scenes), correct dimensions (1080x1920)
□ MP4 validation: captions visible, audio plays, transitions smooth
□ POST /export → MP4 file downloadable + caption text returned
```

#### FE Work (React + MUI — Glassmorphism)

| # | Task | Files | Test (visual) |
|---|---|---|---|
| 1 | AudioStep — Glass Switch (TTS toggle) + glass List (music picker) | `src/components/steps/AudioStep.tsx` | Glass Switch with neon glow, glass List items with hover glow |
| 2 | AudioStep — glass audio preview player | `AudioStep.tsx` | Glass play IconButton with cyan glow → hear voiceover + music |
| 3 | AssemblyStep — glass Select (transitions) + gradient+neon "Assemble" button | `src/components/steps/AssemblyStep.tsx` | Glass Select: fade/slide/zoom. Gradient+neon Button "Assemble Reel" |
| 4 | AssemblyStep — video player in glass Card | `AssemblyStep.tsx` | MP4 plays inline in glass Card after assembly |
| 5 | ReelPreview — glass Card right panel video player | `src/components/preview/ReelPreview.tsx` | Video player in elevated glass Card |
| 6 | ReviewStep (reel) — Platform + Format selects + glass Card preview + gradient+neon export buttons | `ReviewStep.tsx` | Glass Select for Platform + Format (aspect ratio), Download MP4 + copy caption gradient buttons with neon glow |
| 7 | Export buttons — download + clipboard | `ReviewStep.tsx` | "Download MP4" → saves file. "Copy" → glass Snackbar confirmation. |

**FE Validation Checklist (mock data):**
```
□ AudioStep: glass Switch TTS on/off toggle with neon indicator
□ AudioStep: glass List music tracks, selected gets cyan neon border, preview plays
□ AssemblyStep: glass Select dropdown (fade/slide/zoom)
□ AssemblyStep: gradient+neon "Assemble Reel" Button → glass LinearProgress loading
□ AssemblyStep: video player renders mock MP4 in glass Card
□ ReviewStep: shows video + caption + hashtags in glass Cards on ambient canvas
□ Export: gradient+neon "Download MP4" and "Copy Caption" buttons, glass Snackbar on copy
```

#### Integration Test — FULL REEL FLOW E2E

```
□ New Reel → Fitness + IG Reel + 30s
□ Viral DNA → auto-discover → DNA profile
□ Trends → pick "HIIT workout routines"
□ Script → 4 scenes generated → edit hook narration → save
□ Scene Images → Generate All → 4 images → retry scene 2 with "brighter" → pick new
□ Audio → TTS voiceover on + pick upbeat music track → preview plays
□ Assembly → fade transitions → click "Assemble" → loading → MP4 preview plays
□ MP4: ~30s, 1080x1920, Ken Burns zoom on images, fade transitions, captions visible, audio plays
□ Export → download MP4 → file is valid. Copy caption → clipboard works.
□ Step-back: go to Script → change scene → scene images "needs refresh" → re-generate → re-assemble
```

---

### PHASE 6: Polish + Draft Management (Days 23-26)

**Goal**: Production-quality UX, edge cases handled, drafts resumable.

#### BE Work

| # | Task | Test |
|---|---|---|
| 1 | Project list with status (draft/in_progress/completed) | `curl GET /api/projects` → status field correct per project |
| 2 | Project status auto-update (set 'completed' on export) | After export → project.status = 'completed' |
| 3 | Asset cleanup on project delete | Delete project → asset files removed from disk |
| 4 | Error handling: API key missing → clear error message | Missing key → 400 "OpenAI API key not configured" |
| 5 | Error handling: AI rate limit → retry guidance | 429 → "Rate limited, try again in X seconds" |
| 6 | Error handling: Ollama not running → clear message | Connection refused → "Ollama not reachable at localhost:11434" |
| 7 | File cleanup: old temp files removed | Assembly temp files cleaned after final MP4 |

#### FE Work (React + MUI — Glassmorphism Polish)

| # | Task | Test |
|---|---|---|
| 1 | Home page: glass Cards with neon status Chips (green=done, purple=draft) + resume | Click glass draft card → resumes at last step |
| 2 | Home page: delete project with glass Dialog confirmation | Click delete IconButton (red glow) → glass Dialog "Are you sure?" → delete |
| 3 | Loading states: glass Skeleton wave + neon pulse on all generation steps | Every generate/retry → glass Skeleton animation with neon pulse border |
| 4 | Error toasts: glass Snackbar (red left border + blur bg) for API errors | Bad API key → glass Snackbar "API key invalid" |
| 5 | "Needs refresh" amber neon Badge on downstream Stepper steps | After step-back → amber neon glow Badge on affected stepper dots |
| 6 | Empty states: centered Typography + subtle glass illustration card | Clean empty state messaging on ambient canvas |
| 7 | Responsive: glass panels stack on mobile, ambient bg scales | Glass preview panel collapses below step panel on xs/sm, blur reduces on mobile |

#### Integration Test — FULL REGRESSION

```
□ Image flow E2E: start → export PNG (repeat of Phase 3 test)
□ Reel flow E2E: start → export MP4 (repeat of Phase 5 test)
□ Resume draft: create project → close browser → reopen → resume at last step
□ Step-back: full chain test (image + reel flows)
□ Error handling: remove API key → clear error on generation attempt
□ Error handling: enter wrong API key → "Invalid API key" toast
□ Delete project: project + assets removed
□ Multiple projects: create 3 projects, list shows all, resume any
```

---

## 7. Phase Summary

| Phase | Days | Delivers | BE Testable With | FE Testable With |
|---|---|---|---|---|
| **1: Skeleton** | 1-3 | FastAPI + SQLAlchemy + Project CRUD + React + MUI glassmorphism theme + wizard shell | curl/Swagger: create/list/navigate projects | UI: glass cards, neon stepper, ambient canvas, click through 6/8 steps |
| **2: Settings + Retry** | 4-6 | Provider config + retry/enhance UI + mock AI | curl/Swagger: settings CRUD, mock generate/retry | UI: glass settings form, glass attempt browser, neon enhance input |
| **3: Image Flow** | 7-11 | Full image creation with real AI | curl/Swagger: real GPT-4o captions, DALL-E images, DNA analysis | UI: full glassmorphism image wizard with real SSE streaming |
| **4: Reel Script+Images** | 12-16 | Script + per-scene images | curl/Swagger: real script gen, scene images, per-scene retry | UI: glass script editor, glass scene grid with neon per-scene controls |
| **5: Reel Audio+Assembly** | 17-22 | Full reel MP4 output | curl/Swagger: TTS, FFmpeg assembly, export MP4 | UI: glass audio picker, glass video preview, neon export buttons |
| **6: Polish** | 23-26 | Production UX, drafts, errors | curl/Swagger: status updates, error responses, cleanup | UI: glass project list, glass Skeleton loaders, glass Snackbar toasts |

---

## 8. Testing Strategy Per Phase

```
Each phase has 3 test layers:

1. BE UNIT/API TEST (no FE needed):
   → curl commands or Swagger UI (/docs) validate each FastAPI endpoint
   → pytest unit tests for state machine, DNA injector, FFmpeg
   → Can run in CI or manually

2. FE VISUAL TEST (no BE needed):
   → MUI components render correctly with mock/hardcoded data
   → User interactions work (click, type, navigate)
   → Can test by running `npm run dev` (Vite :5173) and clicking through UI
   → Dark theme visually verified (backgrounds, accents, gradients)

3. INTEGRATION TEST (FE ↔ BE):
   → End-to-end flow: user action → axios call to FastAPI → DB update → UI update
   → Run after both FE + BE for that phase are done
   → Validates the contract between Pydantic schemas and TypeScript types
   → CORS verified (React :5173 ↔ FastAPI :8000)

Mock strategy:
   → Phase 1-2: FastAPI returns mock AI data → FE works with it
   → Phase 3+: Real AI calls replace mocks progressively
   → FE can always fall back to mock data if BE isn't ready
```

---

## 9. Implementation Log

### PHASE 1 — Status: IN PROGRESS

#### BE — DONE

| # | Task | Status | Files Created |
|---|---|---|---|
| 1 | FastAPI + SQLAlchemy + SQLite + uvicorn | DONE | `backend/requirements.txt`, `app/main.py`, `app/config.py`, `app/database.py` |
| 2 | Full DB schema (SQLAlchemy models) | DONE | `app/models/project.py`, `app/models/step.py`, `app/models/attempt.py`, `app/models/category.py`, `app/models/settings.py`, `app/models/__init__.py` |
| 3 | Pydantic schemas | DONE | `app/schemas/project.py`, `app/schemas/step.py`, `app/schemas/attempt.py`, `app/schemas/category.py`, `app/schemas/__init__.py` |
| 4 | Seed categories | DONE | `app/seed.py` (8 categories: Fitness, Food, Tech, Art, Travel, Education, Business, Lifestyle) |
| 5 | Project CRUD APIs | DONE | `app/routers/projects.py` — POST, GET list, GET by id, PUT update, DELETE |
| 6 | Categories API | DONE | `app/routers/categories.py` — GET list |
| 7 | Step navigation API | DONE | `app/routers/projects.py` — POST `/:id/navigate` with step-back invalidation |
| 8 | State machine logic | DONE | `app/services/workflow.py` (navigate + step-back), `app/services/steps.py` (step definitions) |
| 9 | CORS middleware | DONE | `app/main.py` — allows :5173 and :5174 |

**BE Validation:**
```
[x] POST /api/projects {type:'image'} → 201, project with 6 steps
[x] POST /api/projects {type:'reel'}  → 201, project with 8 steps
[ ] GET /api/projects                 → pending full curl verification
[ ] GET /api/projects/:id             → pending
[ ] DELETE /api/projects/:id          → pending
[ ] GET /api/categories               → pending
[ ] POST navigate (step-back)         → pending
[ ] POST navigate (skip forward)      → pending
```

**How to run:**
```bash
cd backend
source venv/bin/activate       # Python 3.11 venv
uvicorn app.main:app --reload  # starts on :8000, Swagger at /docs
```

#### FE — DONE

| # | Task | Status | Files Created |
|---|---|---|---|
| 1 | Vite + React + MUI + Router + Zustand + axios | DONE | `package.json`, `vite.config.ts` |
| 2 | MUI glassmorphism theme | DONE | `src/theme/theme.ts` — canvas #08090E, glass Paper/Card overrides, neon glows |
| 3 | Glass card reusable styles | DONE | `src/theme/glassStyles.ts` — glassCard, gradientButton, gradientText, glassActionBar, neonGlow |
| 4 | App shell (ThemeProvider + Router) | DONE | `src/App.tsx`, `src/main.tsx` (Inter + JetBrains Mono fonts) |
| 5 | AppLayout + AppHeader | DONE | `src/components/layout/AppLayout.tsx`, `AppHeader.tsx` — glass AppBar, gradient logo |
| 6 | Home page | DONE | `src/pages/HomePage.tsx` — glass New Image/Reel cards, mock project list |
| 7 | Zustand wizard store | DONE | `src/store/wizardStore.ts` — step nav, step-back with needs_refresh |
| 8 | WizardLayout (2-panel) | DONE | `src/components/wizard/WizardLayout.tsx` — 60%/40% glass panels |
| 9 | StepProgress (stepper) | DONE | `src/components/wizard/StepProgress.tsx` — gradient connector, neon glow dots |
| 10 | StepNavigator | DONE | `src/components/wizard/StepNavigator.tsx` — glass action bar, gradient Accept |
| 11 | CategoryStep | DONE | `src/components/steps/CategoryStep.tsx` — 8 glass category cards from BE (category only; platform/format moved to ReviewStep) |
| 12 | Placeholder steps | DONE | `src/components/steps/PlaceholderStep.tsx` — Skeleton shells for all steps |
| 13 | ProjectPage | DONE | `src/pages/ProjectPage.tsx` — loads wizard by project ID |
| 14 | API client | DONE | `src/api/client.ts` — axios instance to :8000 |

**Additional files:**
- `src/types/index.ts` — Project, Step, Attempt types + IMAGE_STEPS/REEL_STEPS config
- `src/pages/SettingsPage.tsx` — placeholder for Phase 2
- `src/components/preview/PreviewPanel.tsx` — right panel skeleton preview

**FE Validation:**
```
[ ] Canvas background: #08090E with ambient radial washes
[ ] Glass cards render with blur + border
[ ] Home page: New Image / New Reel cards with hover glow
[ ] Stepper: gradient connector, neon dots
[ ] CategoryStep: glass cards, neon selected border
[ ] StepNavigator: glass bar, gradient Accept
[ ] Placeholder steps: glass Skeleton
[ ] Two-panel layout: 60% + 40% glass panels
[ ] Glass header: blur, gradient logo
```

**How to run:**
```bash
cd frontend
npm run dev  # starts on :5173 (or :5174 if 5173 in use)
```

#### Integration — PENDING

```
[ ] FE calls BE (New Image → POST /api/projects → wizard loads from DB)
[ ] Navigate forward/backward → DB updates
[ ] CategoryStep saves selection
[ ] Step-back invalidation
```

**Notes:**
- Python venv uses 3.11 (3.14 incompatible with pydantic-core)
- FE currently uses mock data in Zustand store; not yet wired to BE APIs
- Boilerplate assets (hero.png, react.svg, vite.svg) still in src/assets/ — can be cleaned up

---

## 10. User Test Flows (FE → BE)

Step-by-step click-through instructions to verify each phase end-to-end. Start both servers before testing:

```bash
# Terminal 1 — Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload
# → http://localhost:8000 (Swagger: http://localhost:8000/docs)

# Terminal 2 — Frontend
cd frontend && npm run dev
# → http://localhost:5173
```

---

### PHASE 1 TEST: Skeleton — Project + Wizard + Navigation

**Prerequisite:** Both BE (:8000) and FE (:5173) running.

#### Test 1.1 — Home Page Renders

```
1. Open http://localhost:5173
2. VERIFY: Dark canvas background (#08090E) with subtle purple/cyan ambient glow
3. VERIFY: Glass header bar at top — "ContentForge" in gradient text, Settings button
4. VERIFY: Two glass cards — "New Image Post" and "New Reel / Short"
5. VERIFY: Cards have frosted glass effect (semi-transparent bg, blur, subtle border)
6. HOVER over "New Image Post" card
7. VERIFY: Card border glows purple on hover
8. HOVER over "New Reel" card
9. VERIFY: Card border glows cyan on hover
```

#### Test 1.2 — Create Image Project (FE → BE)

```
1. Click "New Image Post" card
2. VERIFY (behind the scenes): POST /api/projects {type:'image'} fires → 201
3. VERIFY: Browser navigates to /projects/<uuid>
4. VERIFY: Wizard appears with 6-step MUI Stepper:
   Category — Viral DNA — Trends — Caption — Image — Review
5. VERIFY: Step 1 (Category) has purple neon glow dot = active
6. VERIFY: Steps 2-6 have glass dots (grey, no glow) = pending
7. VERIFY: Gradient connector line between steps
8. VERIFY: Two-panel layout — step panel (left, ~60%) + preview panel (right, ~40%)
9. VERIFY: Both panels are glass cards (blur, border, shadow)
10. VERIFY: Glass action bar at bottom — "Back" (disabled), "Accept & Continue" (gradient button)
```

#### Test 1.3 — CategoryStep Interaction

```
1. On the Category step, VERIFY: 6 glass category cards in a grid:
   Fitness, Food & Cooking, Technology, Art & Design, Travel, Education
2. Click "Fitness" card
3. VERIFY: Fitness card gets purple neon border + glow (selected state)
4. Click "Technology" card
5. VERIFY: Technology now has purple border, Fitness loses it
6. Select "Instagram" from Platform dropdown
7. VERIFY: Dropdown has glass styling (dark bg, subtle border)
8. Select "Square Post (1:1)" from Format dropdown
9. VERIFY: Both selections persist visually
```

#### Test 1.4 — Wizard Step Navigation

```
1. Click "Accept & Continue" (gradient button)
2. VERIFY: Step 1 (Category) dot turns green with green neon glow = completed
3. VERIFY: Step 2 (Viral DNA) dot turns purple with glow = active
4. VERIFY: Gradient connector fills between step 1 and 2
5. VERIFY: Step panel shows "Viral DNA Analysis" placeholder with Skeleton loaders
6. Click "Accept & Continue" again
7. VERIFY: Now on Step 3 (Trends), steps 1-2 are green
8. Continue clicking through all 6 steps
9. VERIFY: On step 6 (Review), button says "Export" instead of "Accept & Continue"
10. VERIFY: "Back" button is enabled on steps 2-6
```

#### Test 1.5 — Step-Back Invalidation

```
1. Navigate to Step 4 (Caption) — steps 1-3 should be green (completed)
2. Click on Step 2 (Viral DNA) dot in the stepper
3. VERIFY: You jump back to Step 2
4. VERIFY: Step 2 dot is purple (active)
5. VERIFY: Steps 3-4 dots turn amber/yellow with warning icon = needs_refresh
6. VERIFY: Step 1 stays green (unaffected)
```

#### Test 1.6 — Create Reel Project

```
1. Click "ContentForge" logo in header → navigate to home
2. Click "New Reel / Short" card
3. VERIFY: POST /api/projects {type:'reel'} fires → 201
4. VERIFY: Wizard has 8-step stepper:
   Category — Viral DNA — Trends — Script — Scenes — Audio — Assembly — Review
5. Navigate through all 8 steps using "Accept & Continue"
6. VERIFY: All 8 steps navigable, each shows appropriate placeholder
```

#### Test 1.7 — Settings Page

```
1. Click "Settings" button in header
2. VERIFY: Navigates to /settings
3. VERIFY: Glass card with "AI Providers" heading
4. VERIFY: Skeleton placeholders (Phase 2 content not yet built)
5. Click "ContentForge" logo → back to home
```

#### Test 1.8 — API Verification (Swagger)

```
1. Open http://localhost:8000/docs in a new tab
2. VERIFY: Swagger UI loads with all endpoints listed
3. Try POST /api/projects with body: {"type": "image"}
4. VERIFY: 201 response with project object containing 6 steps
5. Copy the project id from response
6. Try GET /api/projects/{id} with that id
7. VERIFY: Returns full project with steps array
8. Try GET /api/categories
9. VERIFY: Returns 8 seeded categories (Fitness, Food, Tech, etc.)
10. Try POST /api/projects/{id}/navigate with body: {"target_step": "trends"}
11. VERIFY: current_step updated, step statuses correct
12. Try POST /api/projects/{id}/navigate with body: {"target_step": "category"}
13. VERIFY: Step-back — downstream steps marked "needs_refresh"
14. Try DELETE /api/projects/{id}
15. VERIFY: Project deleted, GET returns 404
```

---

### PHASE 2 TEST: Settings + Provider + Retry UI

**Prerequisite:** Phase 1 tests pass.

#### Test 2.1 — Settings Page (Provider Config)

```
1. Navigate to /settings
2. VERIFY: Glass cards for 3 provider types — Text, Image, Vision
3. Toggle "Cloud" / "Local" switch on Text provider
4. VERIFY (cloud): API Key glass TextField + Model glass Select (gpt-4o, gpt-4o-mini)
5. VERIFY (local): Ollama URL glass TextField + Model glass TextField
6. Enter an API key → click "Save"
7. VERIFY: PUT /api/settings/providers/text fires → saves to DB
8. Refresh page → VERIFY: saved values reload
9. Click "Test Connection" button
10. VERIFY: POST /api/settings/providers/text/test fires
11. VERIFY (valid key): green neon glow success indicator
12. VERIFY (invalid key): red glow error indicator with message
```

#### Test 2.2 — Generate + Retry + Enhance Flow (Mock Data)

```
1. Create new Image project → navigate to Caption step (step 4)
2. Click "Generate" button
3. VERIFY: POST /api/steps/{step_id}/generate fires
4. VERIFY: Glass Skeleton loader with wave + neon pulse while generating
5. VERIFY: Mock caption data renders in glass Cards (3 variants)
6. VERIFY: AttemptBrowser shows "1 of 1"
7. Click "Retry" button
8. VERIFY: POST /api/steps/{step_id}/retry fires
9. VERIFY: New caption data renders
10. VERIFY: AttemptBrowser shows "2 of 2"
11. Click "◄" arrow in AttemptBrowser
12. VERIFY: Shows attempt 1 content
13. Type "more emoji" in EnhanceInput glass TextField
14. VERIFY: Purple neon focus ring on TextField
15. Click "Enhance & Retry"
16. VERIFY: POST /api/steps/{step_id}/retry {enhancement: "more emoji"} fires
17. VERIFY: AttemptBrowser shows "3 of 3"
18. Click attempt 1 → click "Select"
19. VERIFY: PUT /api/steps/{step_id}/select {attempt_id} fires → attempt 1 is now selected
```

---

### PHASE 3 TEST: Image Flow — Real AI End-to-End

**Prerequisite:** Phase 2 tests pass. OpenAI API key configured in Settings.

#### Test 3.1 — Full Image Creation Flow

```
1. Create new Image project → pick "Fitness" + "Instagram" + "Square Post"
2. Accept → Step 2: Viral DNA
3. Click "Auto-discover" button
4. VERIFY: POST /api/viral-dna/auto {category:'fitness'} fires
5. VERIFY: Loading state → DNA profile appears in nested glass card
6. VERIFY: Color swatches (neon circles), style/mood/CTA glass Chips
7. Click "Edit" → modify mood to "energetic" → Save
8. VERIFY: PUT /api/viral-dna/{id} fires → profile updates
9. Accept → Step 3: Trends
10. VERIFY: GET /api/trends?category=fitness fires
11. VERIFY: Glass Chips with trending topics appear
12. Click a trend topic chip → cyan neon border on selected
13. Accept → Step 4: Caption
14. Click "Generate"
15. VERIFY: POST /api/steps/{id}/generate fires (SSE streaming)
16. VERIFY: Caption text streams in word-by-word with glass LinearProgress
17. VERIFY: 3 caption variants in glass Cards
18. Select a caption → card gets purple neon border
19. Edit hashtags inline
20. Accept → Step 5: Image
21. Click "Generate"
22. VERIFY: POST fires → DALL-E 3 images appear (2-4) in glass grid
23. Select an image → neon glow border
24. Click "Retry" → new images → browse attempts
25. Accept → Step 6: Review
26. VERIFY: Selected image + caption + hashtags shown in glass preview Card
27. Click "Download PNG" → VERIFY: image file downloads
28. Click "Copy Caption" → VERIFY: text in clipboard, glass Snackbar confirms
```

#### Test 3.2 — Step-Back Re-generation

```
1. From Review (step 6), click Trends step (step 3) in stepper
2. VERIFY: Steps 4-6 turn amber (needs_refresh)
3. Pick a different trend topic
4. Accept → Caption step
5. VERIFY: Old captions gone, "Generate" button active
6. Re-generate → new captions based on new topic
7. Continue through to Review → verify new content
```

---

### PHASE 4 TEST: Reel Script + Scene Images

**Prerequisite:** Phase 3 tests pass.

#### Test 4.1 — Script Generation

```
1. Create new Reel → pick "Fitness" + "Instagram" + "Reel"
2. (optional) Complete Viral DNA + Trends
3. Navigate to Step 4: Script
4. Click "Generate"
5. VERIFY: POST /api/steps/script/generate fires
6. VERIFY: 4 glass Cards appear — one per scene
7. VERIFY: Each card shows narration, visual description, duration
8. Click into narration field on Scene 2
9. VERIFY: Glass TextField with purple neon focus ring
10. Edit the narration text → text updates live
11. Click "Add Scene" button
12. VERIFY: 5th glass card appears
13. Click delete icon on Scene 5
14. VERIFY: Red glow on hover → card removed → 4 scenes
15. Click "Save" → PUT /api/steps/script fires → saved to DB
```

#### Test 4.2 — Scene Image Generation

```
1. Accept → Step 5: Scene Images
2. VERIFY: 4 glass SceneCards in 2x2 grid
3. Click "Generate All" (gradient button)
4. VERIFY: POST /api/scenes/generate-all fires
5. VERIFY: Glass Skeleton wave on all 4 cards simultaneously
6. VERIFY: 4 DALL-E images appear in cards
7. Click Retry icon on Scene 3
8. VERIFY: Enhancement glass TextField appears with purple focus
9. Type "more dramatic lighting" → submit
10. VERIFY: POST /api/scenes/{id}/retry fires → new image for Scene 3 only
11. VERIFY: Other 3 scenes unchanged
12. Browse Scene 3 attempts → pick original → image reverts
```

#### Test 4.3 — Script-to-Scenes Dependency

```
1. Step-back to Script (step 4)
2. VERIFY: Scene Images step (5) turns amber (needs_refresh)
3. Edit a scene narration → Save
4. Accept → Scene Images shows "needs refresh" state
5. Re-generate images → new images based on updated script
```

---

### PHASE 5 TEST: Reel Audio + Assembly + Export

**Prerequisite:** Phase 4 tests pass. FFmpeg installed on system.

#### Test 5.1 — Audio Configuration

```
1. Continue reel project → Step 6: Audio
2. VERIFY: Glass Switch for TTS voiceover — toggle on
3. VERIFY: POST /api/steps/audio/generate fires
4. VERIFY: Glass List of music tracks appears
5. Select a music track → cyan neon border on selected
6. Click play button → audio preview plays
7. Accept → Step 7: Assembly
```

#### Test 5.2 — Video Assembly

```
1. On Assembly step, VERIFY: Glass Select dropdown for transitions
2. Select "Fade" transition
3. Click "Assemble Reel" (gradient+neon button)
4. VERIFY: POST /api/assemble fires
5. VERIFY: Glass LinearProgress loading bar
6. VERIFY: MP4 video player appears in glass Card after assembly
7. Play the video preview
8. VERIFY: ~30s duration, 1080x1920 vertical, Ken Burns zoom on images
9. VERIFY: Fade transitions between scenes
10. VERIFY: Captions visible as text overlays
11. VERIFY: Voiceover + music audio plays
```

#### Test 5.3 — Export

```
1. Accept → Step 8: Review
2. VERIFY: Video + caption + hashtags in glass preview Card
3. Click "Download MP4"
4. VERIFY: MP4 file downloads, playable in system player
5. VERIFY: Correct resolution (1080x1920), duration (~30s)
6. Click "Copy Caption"
7. VERIFY: Caption text copied to clipboard
8. VERIFY: Glass Snackbar confirmation appears
```

#### Test 5.4 — Step-Back Full Chain

```
1. From Review, click Script step (step 4)
2. VERIFY: Steps 5-8 turn amber (needs_refresh)
3. Edit a scene → Save → re-generate scene images → re-add audio → re-assemble
4. VERIFY: New MP4 reflects changes
```

---

### PHASE 6 TEST: Polish + Draft Management

**Prerequisite:** Phase 5 tests pass.

#### Test 6.1 — Project List + Resume

```
1. Create 3 projects: 1 completed image, 1 draft reel, 1 in-progress image
2. Navigate to home page
3. VERIFY: All 3 projects shown as glass Cards
4. VERIFY: Status Chips — green "completed", purple "draft", amber "in_progress"
5. Click on the draft reel card
6. VERIFY: Wizard opens at the last step you were on (resumes)
7. Continue working → verify state was preserved
```

#### Test 6.2 — Delete Project

```
1. On home page, click delete icon on a project card
2. VERIFY: Red glow on delete icon hover
3. VERIFY: Glass Dialog appears — "Are you sure you want to delete?"
4. Click "Delete"
5. VERIFY: DELETE /api/projects/{id} fires
6. VERIFY: Project removed from list, card disappears
7. VERIFY: Swagger — GET /api/projects/{id} returns 404
```

#### Test 6.3 — Error Handling

```
1. Go to Settings → clear the OpenAI API key → Save
2. Create new Image project → navigate to Caption → click "Generate"
3. VERIFY: Glass Snackbar error toast — "OpenAI API key not configured"
4. VERIFY: Red left border on Snackbar, blur background
5. Go to Settings → enter an invalid API key → Save
6. Try Generate again
7. VERIFY: Glass Snackbar — "Invalid API key"
8. Go to Settings → enter correct key → Test Connection → green success
```

#### Test 6.4 — Responsive Layout

```
1. Resize browser window to mobile width (~375px)
2. VERIFY: Preview panel stacks below step panel (not side by side)
3. VERIFY: Glass cards still render (blur may reduce on mobile)
4. VERIFY: Stepper is still usable (may scroll horizontally)
5. VERIFY: All buttons and inputs remain accessible
```

#### Test 6.5 — Full Regression

```
1. Complete full Image flow: New → Category → DNA → Trends → Caption → Image → Review → Export PNG
2. Complete full Reel flow: New → Category → Script → Scenes → Audio → Assembly → Review → Export MP4
3. VERIFY: Both exported files are valid
4. Close browser → reopen http://localhost:5173
5. VERIFY: Projects list shows both completed projects
6. Click completed image project → VERIFY: Review step with exported content
```
