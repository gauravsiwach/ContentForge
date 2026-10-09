---
agent: devin-local
session: cottony-matrix
created: 2026-09-19T17:51:09Z
---
# PRD: ContentForge — AI Social Media Content Creator

A step-by-step AI-assisted tool for creating social media images and reels for Instagram, Facebook, and YouTube — with viral content DNA analysis, trend discovery, retry with enhancement, step-back navigation, and flexible AI provider selection (cloud APIs or local models).

---

## 1. Overview

**Product Name**: ContentForge

**What it is**: A personal web tool that guides you through creating social media images and reels step-by-step, with AI doing the heavy lifting at each step. You can analyze viral content to extract winning attributes, review/edit/retry at every step with enhancement feedback, choose your AI provider (cloud or local), and go back to any previous step.

**Who it's for**: You — a solo content creator posting to Instagram, Facebook, and YouTube.

**Core Problem**: Creating quality social media content (images + reels) is time-consuming. You need to research trends, study what's going viral, write captions, generate visuals, and assemble reels — all manually across multiple tools. This tool unifies the workflow into one guided, AI-powered pipeline.

---

## 2. MVP Split Strategy

| | MVP-1 (3-4 weeks) | MVP-2 (+2-3 weeks) |
|---|---|---|
| **Image Flow** | Full 6-step flow | -- |
| **Reel Flow** | Stitch mode only (FFmpeg) | + AI video modes (text-to-video, image-to-video) |
| **Viral DNA** | Auto-discover + manual upload | Saved DNA templates, reuse across projects |
| **AI Providers** | OpenAI (cloud) + Ollama (local) | + Anthropic, Google, ComfyUI, per-step override |
| **Video AI** | -- | Kling, Veo, Runway integration |
| **Export** | Single platform format | Multi-platform resize/export |
| **Audio** | TTS (browser API) + bundled music | OpenAI TTS, ElevenLabs |

**MVP-1 delivers**: A fully working tool where you can create images and basic reels (image stitch) end-to-end with AI, viral DNA, trends, retry/enhance, and step-back.

**MVP-2 adds**: AI video generation (Kling/Veo), more providers, fancier audio, multi-format export.

---

## 3. Target Platforms (Output Formats)

| Platform | Image Formats | Reel/Video Formats |
|---|---|---|
| **Instagram** | Post (1080x1080, 1080x1350), Story (1080x1920) | Reel (1080x1920, up to 90s) |
| **Facebook** | Post (1200x630), Story (1080x1920) | Reel (1080x1920, up to 90s) |
| **YouTube** | Thumbnail (1280x720) | Shorts (1080x1920, up to 60s) |

**MVP-1**: Generate in **one format per project** (user picks at start). Multi-format export in MVP-2.

---

## 4. Core Feature: Viral Content DNA Analysis

### What It Does

When user selects the viral option, the system **automatically discovers** viral content in their category, extracts the visual/content DNA, and applies those attributes to all downstream AI generations.

### How Auto-Discover Works

```
User clicks "Analyze Viral Content" on the Viral DNA step:

1. System searches for viral content in the user's category using one of:
   a) ViralHunt API — GET /trending?source=instagram&keyword={category}&sort=viral
      → Returns: post URLs, thumbnails, engagement stats
   b) Web Search fallback — search "viral {category} instagram posts" via Brave/SerpAPI
      → Returns: image URLs from search results

2. System fetches the top 3-5 post thumbnails/images

3. GPT-4o Vision analyzes each image and extracts DNA:
   → dominant_colors, visual_style, content_format, text_style,
     mood, hook_pattern, cta_pattern

4. DNA Profile is shown to user for review/edit

5. Profile is injected into all downstream generation prompts
```

### Manual Method (Always Available)
- User pastes a URL → system fetches the image → GPT-4o Vision analyzes
- User uploads a screenshot → GPT-4o Vision analyzes directly

### Viral DNA Attributes

| Attribute | Extracted | Applied To |
|---|---|---|
| **Color Palette** | Dominant colors + hex codes | Image generation prompt |
| **Visual Style** | Composition, lighting, aesthetic | Image/video style |
| **Content Format** | Structure (before/after, list, POV, etc.) | Script structure, caption format |
| **Text Style** | Font feel, placement, overlay style | Caption overlays |
| **Mood/Tone** | Energetic, calm, provocative, etc. | Caption tone, script tone |
| **Hook Pattern** | First 3 seconds — what stops the scroll | Reel hook |
| **CTA Pattern** | How the content closes | CTA suggestions |

---

## 5. Core Feature: AI Provider Selection

### MVP-1 Scope (Simplified)

Two providers only — keeps adapter code minimal:

| Task | Cloud (default) | Local |
|---|---|---|
| **Text** | OpenAI GPT-4o | Ollama (any model) |
| **Image** | OpenAI DALL-E 3 | -- (cloud only in MVP-1) |
| **Vision** | OpenAI GPT-4o Vision | Ollama LLaVA (if available) |
| **TTS** | Browser Web Speech API (free) | -- |

Settings page: Just API key input for OpenAI + Ollama URL/model selection.

### MVP-2 Additions
- Anthropic Claude, Google Gemini for text
- Replicate Flux, Google Imagen, ComfyUI for images
- Kling, Veo, Runway for video
- OpenAI TTS, ElevenLabs for voiceover
- Per-step provider override (gear icon)

### Technical: Same SDK for Cloud & Local

```python
from openai import OpenAI

# Cloud
client = OpenAI(api_key="sk-...")

# Local (Ollama — OpenAI-compatible)
client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"
)

# Same client.chat.completions.create() call for both
```

---

## 6. Core Feature: Retry with Enhancement

Available on every AI-generation step.

```
[Accept ✓]           → Move to next step
[Retry ↻]            → Same input, new output (AI temperature variation)
[Enhance & Retry ✏️↻] → Same input + user feedback → improved output

All attempts stored in DB — user can browse ◄ 1 of 3 ► and pick any.
```

| Step | Example Enhancement |
|---|---|
| Viral DNA | "focus more on color analysis" |
| Content | "make overlay punchier", "shorter quote", "add emoji, more casual feed caption" |
| Image | "brighter colors, match viral DNA colors" |
| Script | "make hook more dramatic, shorter scenes" |
| Scene Images | "more cinematic, different angle" |
| Audio | "slower pace" |

---

## 7. User Flows

### 7.1 Image Creation Flow — MVP-1 (6 steps)

```
Step 1: CATEGORY
  → Pick category (motivation, food, tech, fitness, fashion, travel, lifestyle, etc.)
  → Platform + format picked at export time (Step 6)

Step 2: VIRAL DNA (optional, skippable)
  → [Auto-discover] → system finds viral content, extracts DNA → user reviews/edits
  → [Manual] → paste URL or upload screenshot → extract DNA
  → [Skip] → no DNA, proceed without
  → [Retry] / [Enhance & Retry] available

Step 3: DISCOVER TRENDS (optional, skippable)
  → AI fetches trending topics in category (TrendsAPI)
  → User picks trend OR types custom topic
  → [Retry] / [Enhance & Retry] available

Step 4: CONTENT — Text, Caption & Hashtags
  → AI generates 3 content variants. Each variant contains:
      - overlay_text: the punchy text that goes ON the image
          (e.g. motivational quote, hook, tip, question — driven by category)
          Examples by category:
            Motivation → "Discipline beats motivation. Every single day."
            Fitness    → "No gym? No excuse. 20 min. Full body. Let's go."
            Food       → "5 ingredients. 15 minutes. Flavour you won't forget."
            Tech       → "The AI tool 90% of creators don't know exists yet."
            Travel     → "The trip that changed everything started with one yes."
      - feed_caption: the longer text posted below the image in the feed
      - hashtags: 8-15 relevant tags
  → DNA injected: tone, format, CTA style, hook pattern
  → User reviews all 3 variants side by side
  → User edits overlay_text or feed_caption inline
  → [Retry] / [Enhance & Retry "make it punchier"] → browse attempts ◄ 2/3 ►
  → User APPROVES one variant → moves to image generation

Step 5: IMAGE GENERATION
  → AI generates background image using approved overlay_text + topic + DNA
  → DALL-E 3 generates clean background (no text — reliable quality)
  → System composites approved overlay_text onto background using Pillow:
      - Font size, position, color from DNA text_style profile
      - Text rendered pixel-perfect (not AI-generated, so never garbled)
  → User sees the FINAL image with text — exactly what will be posted
  → [Retry background] / [Retry with different style preset]
  → Style presets: minimal, bold, cinematic, flat
  → User APPROVES the final image

Step 6: FINAL REVIEW & EXPORT
  → Preview: final image (background + overlay text) + feed_caption + hashtags
  → Pick platform (Instagram / Facebook / YouTube) + format (aspect ratio)
  → Edit feed_caption inline if needed
  → Export: Download PNG + copy feed_caption + hashtags to clipboard
```

### 7.2 Reel Creation Flow — MVP-1 (8 steps, Stitch Mode Only)

```
Step 1: CATEGORY & FORMAT
  → Pick category
  → Pick platform (IG Reel, YT Short, FB Reel)
  → Pick duration target (15s, 30s, 60s)

Step 2: VIRAL DNA (optional, skippable)
  → Same as image flow

Step 3: DISCOVER TRENDS (optional, skippable)
  → Same as image flow

Step 4: SCRIPT & SCENES
  → AI generates scene-by-scene script:
      Scene 1: Hook (0-3s) — narration + visual description
      Scene 2: Context (3-10s) — narration + visual description
      Scene 3: Core (10-25s) — narration + visual description
      Scene 4: CTA (last 3-5s) — narration + visual description
  → DNA injected: hook pattern, format, mood
  → User reviews/edits each scene, can add/remove/reorder
  → [Retry full] / [Retry single scene] / [Enhance & Retry]

Step 5: SCENE IMAGE GENERATION
  → AI generates 1 image per scene from visual description
  → DNA injected: colors, visual style
  → User reviews EACH scene image individually
  → [Retry per scene] / [Enhance & Retry per scene] / [Retry all]

Step 6: AUDIO
  → Options:
      A) TTS voiceover (Browser Web Speech API, free)
      B) Background music (pick from bundled library)
      C) Both
      D) No audio (captions only)
  → Preview audio
  → [Retry] / [Enhance & Retry] for voiceover

Step 7: ASSEMBLY & PREVIEW
  → FFmpeg stitches: scene images + transitions + Ken Burns + captions + audio
  → Transition options: fade, slide-left, slide-right, zoom-in, zoom-out
  → Ken Burns: slow zoom + pan on each scene image
  → Caption overlay: scene narration text as animated captions
  → Full reel preview with video player
  → Adjust: transition type, caption style, timing

Step 8: EXPORT
  → Download MP4
  → Copy caption + hashtags
```

### 7.3 Reel Creation Flow — MVP-2 Additions

MVP-2 adds Step 6B between Scene Images and Audio:

```
Step 6B: VIDEO GENERATION MODE (MVP-2 only)
  → User picks method:
      [A] TEXT-TO-VIDEO — AI generates video from script text
      [B] IMAGE-TO-VIDEO — AI animates scene images into video clips (RECOMMENDED)
      [C] IMAGE STITCH — Keep using FFmpeg stitch (same as MVP-1)

  For A & B:
  → Video provider: Kling 3.0 via fal.ai (cheapest) / Veo 3.1 / Runway Gen-4
  → Per-scene video clip generation (~5s each)
  → Per-scene review + retry + enhance
```

### 7.4 Step-Back Navigation

At ANY step:
- **Go back 1 step** or **jump to any completed step** via progress bar
- **Downstream invalidation**: modified step → all later steps marked "needs refresh"
- **Special dependencies** (reels):
  - script changed → scene_images invalidated → assembly invalidated
  - scene_images changed → assembly invalidated
  - audio changed → assembly invalidated
- **No data loss**: all outputs + retry attempts kept in DB

---

## 8. Technical Architecture

### 8.1 Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| **Frontend** | React 18+ (Vite) | Fast build, lightweight, separate from backend |
| **UI** | MUI (Material UI v6) | Rich component library, dark theme, Stepper, built-in theming |
| **State (client)** | Zustand | Tracks wizard step + current attempt |
| **Backend** | FastAPI (Python) | Async, auto-docs (Swagger), native AI/ML ecosystem |
| **ORM** | SQLAlchemy 2.0 | Pythonic ORM, async support, mature |
| **Database** | SQLite | Zero-config, file-based |
| **Video Assembly** | FFmpeg (via `ffmpeg-python`) | Transitions, Ken Burns, captions |
| **Streaming** | Server-Sent Events (SSE) | Stream AI generation progress (FastAPI `StreamingResponse`) |
| **AI SDKs** | OpenAI Python SDK + LangChain | Native Python AI ecosystem, Ollama-compatible |
| **Video AI (MVP-2)** | fal.ai Python SDK (`fal-client`) | Kling, Veo access |

### 8.2 Database Schema

```sql
-- Projects
CREATE TABLE projects (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL,          -- 'image' | 'reel'
  category      TEXT,
  platform      TEXT,                   -- 'instagram' | 'facebook' | 'youtube'
  format        TEXT,                   -- 'post_square' | 'post_portrait' | 'story' | 'reel' | 'short' | 'thumbnail'
  current_step  TEXT NOT NULL,
  viral_dna_id  TEXT REFERENCES viral_dna_profiles(id),
  reel_mode     TEXT DEFAULT 'image_stitch',
  status        TEXT DEFAULT 'draft',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Steps
CREATE TABLE project_steps (
  id                  TEXT PRIMARY KEY,
  project_id          TEXT REFERENCES projects(id) ON DELETE CASCADE,
  step_name           TEXT NOT NULL,
  step_order          INTEGER NOT NULL,
  status              TEXT DEFAULT 'pending',
  selected_attempt_id TEXT,
  input_data          TEXT,             -- JSON
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Generation attempts (retry history)
CREATE TABLE generation_attempts (
  id              TEXT PRIMARY KEY,
  step_id         TEXT REFERENCES project_steps(id) ON DELETE CASCADE,
  attempt_number  INTEGER NOT NULL,
  enhancement     TEXT,
  provider_used   TEXT,
  prompt_used     TEXT,
  output_data     TEXT,                 -- JSON
  is_selected     BOOLEAN DEFAULT FALSE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Scene-level data for reels
CREATE TABLE scene_items (
  id              TEXT PRIMARY KEY,
  project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
  scene_number    INTEGER NOT NULL,
  scene_type      TEXT,
  duration_sec    REAL,
  script_data     TEXT,                 -- JSON
  image_asset_id  TEXT REFERENCES generated_assets(id),
  video_asset_id  TEXT REFERENCES generated_assets(id),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Viral DNA profiles
CREATE TABLE viral_dna_profiles (
  id              TEXT PRIMARY KEY,
  project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
  source_type     TEXT NOT NULL,
  source_urls     TEXT,                 -- JSON array
  source_images   TEXT,                 -- JSON array
  category        TEXT,
  dna_data        TEXT NOT NULL,        -- JSON
  provider_used   TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Generated files
CREATE TABLE generated_assets (
  id              TEXT PRIMARY KEY,
  project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
  attempt_id      TEXT REFERENCES generation_attempts(id),
  scene_id        TEXT REFERENCES scene_items(id),
  asset_type      TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  metadata        TEXT,                 -- JSON
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Provider settings
CREATE TABLE provider_settings (
  id              TEXT PRIMARY KEY,
  task_type       TEXT NOT NULL UNIQUE,
  provider_type   TEXT NOT NULL,
  provider_name   TEXT NOT NULL,
  api_key         TEXT,
  base_url        TEXT,
  model           TEXT NOT NULL,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Predefined categories
CREATE TABLE categories (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  icon            TEXT,
  keywords        TEXT                  -- JSON array
);
```

### 8.3 State Machine

```
IMAGE flow:  category → viral_dna → trends → caption → visuals → review
REEL flow:   category → viral_dna → trends → script → scene_images → audio → assembly → review

Rules:
  Forward:   step N → N+1 (requires N completed or skipped)
  Backward:  step N → M (M < N) → steps M+1..N → 'needs_refresh'
  Retry:     same input → new attempt
  Enhance:   same input + feedback → new attempt
  Pick:      select attempt from history
  Skip:      viral_dna, trends (only these are skippable)

Reel dependencies:
  script → scene_images → assembly
  audio → assembly
  (any upstream change invalidates downstream)
```

### 8.4 API Endpoints

```
-- Projects
POST   /api/projects                           — Create project
GET    /api/projects                           — List projects
GET    /api/projects/:id                       — Get project + steps + attempts
DELETE /api/projects/:id                       — Delete project

-- Steps
POST   /api/projects/:id/steps/:step/generate  — AI generation (SSE stream)
POST   /api/projects/:id/steps/:step/retry     — Retry (+enhancement)
PUT    /api/projects/:id/steps/:step/select     — Select attempt
PUT    /api/projects/:id/steps/:step           — Save inline edits
POST   /api/projects/:id/navigate              — Step navigation
GET    /api/projects/:id/steps/:step/attempts  — Attempt history

-- Scenes (reels)
POST   /api/projects/:id/scenes/:sceneId/generate-image
POST   /api/projects/:id/scenes/:sceneId/retry
POST   /api/projects/:id/scenes/generate-all

-- Viral DNA
POST   /api/projects/:id/viral-dna/auto
POST   /api/projects/:id/viral-dna/manual
GET    /api/projects/:id/viral-dna
PUT    /api/projects/:id/viral-dna

-- Trends & Categories
GET    /api/trends?category=tech
GET    /api/categories

-- Assembly & Export
POST   /api/projects/:id/assemble
POST   /api/projects/:id/export

-- Settings
GET    /api/settings/providers
PUT    /api/settings/providers/:taskType
POST   /api/settings/providers/:taskType/test
```

---

## 9. UI Design & Theme

### Design System — Dark Glassmorphism

Inspired by modern AI dashboards (Imesas, AgentGPT) — frosted glass cards over a deep dark canvas with neon accent glows and subtle radial gradients.

#### Color Tokens

| Token | Value | Usage |
|---|---|---|
| **`--bg-canvas`** | `#08090E` | Deepest background — near-black with blue cast |
| **`--bg-gradient`** | `radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(6,182,212,0.06) 0%, transparent 60%)` | Subtle ambient color wash on canvas |
| **`--glass-bg`** | `rgba(255, 255, 255, 0.05)` | Glass card fill (near-transparent) |
| **`--glass-bg-hover`** | `rgba(255, 255, 255, 0.08)` | Glass card hover fill |
| **`--glass-border`** | `rgba(255, 255, 255, 0.12)` | Glass card border — visible edge |
| **`--glass-border-hover`** | `rgba(255, 255, 255, 0.20)` | Glass card border on hover |
| **`--glass-blur`** | `blur(16px) saturate(180%)` | Backdrop filter on glass panels |
| **`--primary`** | `#7C3AED` (purple-violet) | Primary CTA, active stepper, links |
| **`--primary-glow`** | `0 0 20px rgba(124, 58, 237, 0.4)` | Neon glow on active/focus states |
| **`--secondary`** | `#06B6D4` (cyan) | Secondary actions, highlights, data accents |
| **`--secondary-glow`** | `0 0 20px rgba(6, 182, 212, 0.4)` | Cyan neon glow |
| **`--gradient-accent`** | `linear-gradient(135deg, #7C3AED, #06B6D4)` | Stepper track, primary CTA fills, logo |
| **`--success`** | `#10B981` (emerald) | Completed steps, accept actions |
| **`--success-glow`** | `0 0 16px rgba(16, 185, 129, 0.3)` | Success neon glow |
| **`--warning`** | `#F59E0B` (amber) | "Needs refresh" badges |
| **`--error`** | `#EF4444` (red) | Errors, delete actions |
| **`--text-primary`** | `#F1F5F9` | Headings, body text |
| **`--text-secondary`** | `#94A3B8` (slate) | Labels, hints, muted text |
| **`--text-muted`** | `#475569` | Disabled text, placeholders |

#### Typography

| Element | Font | Weight | Size | Notes |
|---|---|---|---|---|
| **Headings** | Inter | 600 (semibold) | 20-28px | Letter-spacing: -0.02em |
| **Body** | Inter | 400 (regular) | 14-16px | Line-height: 1.6 |
| **Labels/Chips** | Inter | 500 (medium) | 12-13px | Uppercase for badges, normal for labels |
| **Monospace** | JetBrains Mono | 400 | 13px | Prompts, JSON previews, code snippets |

#### Spacing & Radius

| Token | Value |
|---|---|
| **`--radius-sm`** | `8px` (buttons, inputs, chips) |
| **`--radius-md`** | `12px` (cards, dialogs) |
| **`--radius-lg`** | `16px` (main panels, modals) |
| **`--radius-full`** | `9999px` (pills, avatar circles) |
| **Spacing base** | `4px` grid — 8, 12, 16, 24, 32, 48 scale |

#### Glass Card CSS (applied to MUI Paper/Card overrides)

```css
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.20);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
```

#### Neon Glow States

```css
/* Active stepper step */
.step-active {
  box-shadow: 0 0 20px rgba(124, 58, 237, 0.4);
  border-color: #7C3AED;
}

/* Completed step */
.step-completed {
  box-shadow: 0 0 16px rgba(16, 185, 129, 0.3);
  border-color: #10B981;
}

/* Selected image/caption card */
.selected-card {
  border: 2px solid #7C3AED;
  box-shadow: 0 0 24px rgba(124, 58, 237, 0.3);
}

/* Primary CTA (Accept, Generate) */
.btn-primary-glow {
  background: linear-gradient(135deg, #7C3AED, #06B6D4);
  box-shadow: 0 4px 20px rgba(124, 58, 237, 0.35);
}
.btn-primary-glow:hover {
  box-shadow: 0 4px 28px rgba(124, 58, 237, 0.5);
}
```

### Key UI Patterns

- **Glass panels everywhere**: All MUI Cards/Papers use frosted glass — semi-transparent bg + blur + subtle white border + inset highlight
- **Ambient canvas glow**: Background has faint purple and cyan radial gradients creating a subtle depth atmosphere
- **Neon accents**: Active states use colored `box-shadow` glows (purple for active, green for complete, cyan for secondary)
- **Gradient stepper track**: Purple-to-cyan gradient fill on the MUI Stepper connector as steps complete, with glow on active dot
- **Smooth transitions**: `transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1)` on all interactive elements
- **Skeleton loaders**: MUI Skeleton with glass background and wave animation during AI generation
- **Toast notifications**: MUI Snackbar with glass background + colored left border (green/red/amber)
- **Neon border inputs**: MUI TextField gets purple border glow on focus (`box-shadow: 0 0 0 2px rgba(124,58,237,0.3)`)
- **Floating action bar**: Bottom StepNavigator is a glass bar with subtle border-top glow

### Main Wizard

```
┌──────────────────────────────────────────────────────────────┐
│ ░░░░░░░░░░ GLASS HEADER BAR ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│  ContentForge    [New Image] [New Reel]  [Projects] [Settings]│
│  (gradient text)  (glass buttons)         (text buttons)      │
├──────────────────────────────────────────────────────────────┤
│  ▓▓▓▓▓▓▓▓ AMBIENT CANVAS (radial purple + cyan wash) ▓▓▓▓▓  │
│                                                               │
│  MUI STEPPER (gradient connector track, neon glow dots)       │
│  ◉═══◉═══◉═══◉═══○═══○                                      │
│  Cat  DNA  Trends Caption Image Review                        │
│  (done=green glow, active=purple glow, pending=glass dot)     │
│                                                               │
│  ┌─ GLASS CARD ──────────┐  ┌─ GLASS CARD ──────────────┐   │
│  │                        │  │                            │   │
│  │   STEP PANEL (60%)     │  │   PREVIEW PANEL (40%)      │   │
│  │   (frosted glass)      │  │   (frosted glass, raised)  │   │
│  │                        │  │                            │   │
│  │   [Step-specific UI]   │  │   [Live preview]           │   │
│  │                        │  │                            │   │
│  │   Attempt: ◄ 2/3 ►     │  │   Provider: GPT-4o [⚙️]    │   │
│  │   (glass ButtonGroup)  │  │   (glass Chip + glow icon) │   │
│  │                        │  │                            │   │
│  │   Enhancement:         │  │                            │   │
│  │   (glass TextField     │  │                            │   │
│  │    w/ neon focus ring)  │  │                            │   │
│  │                        │  │                            │   │
│  └────────────────────────┘  └────────────────────────────┘   │
│                                                               │
│  ┌─ GLASS ACTION BAR ──────────────────────────────────────┐  │
│  │ [← Back]  [Skip]  [Retry ↻] [Enhance ✏️↻]  [Accept →]  │  │
│  │ (glass)   (text)  (glass)   (glass+glow)   (gradient+  │  │
│  │                                              neon glow) │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Viral DNA Step

```
┌─ GLASS CARD ─────────────────────────────────────────────┐
│  VIRAL DNA ANALYSIS                                       │
│                                                           │
│  ┌─ glass ─┐  ┌─ glass ─┐  ┌─ glass ──────┐             │
│  │Auto ✨   │  │Paste URL│  │Upload Image  │             │
│  │(glow btn)│  │(glass)  │  │(glass)       │             │
│  └─────────┘  └─────────┘  └──────────────┘             │
│                                                           │
│  Finding viral fitness content... (pulse animation)       │
│                                                           │
│  ┌─ GLASS CARD (inner, elevated) ─────────────────────┐  │
│  │  ┌─────────────────────────────────────────────────┐│  │
│  │  │  VIRAL DNA PROFILE                              ││  │
│  │  ├─────────────────────────────────────────────────┤│  │
│  │  │  Colors:  ● #FF6B35  ● #1A1A1A  ● #FFFFFF     ││  │
│  │  │           (circular swatches with glow)         ││  │
│  │  │  Style:   [Cinematic] [High contrast] [Bold]   ││  │
│  │  │           (glass Chips)                         ││  │
│  │  │  Format:  Before/After transformation           ││  │
│  │  │  Hook:    "Shocking stat → personal story"     ││  │
│  │  │  Mood:    [Motivational] [Energetic]            ││  │
│  │  │           (glass Chips with cyan border)        ││  │
│  │  │  CTA:     "Save this for later"                ││  │
│  │  │                                                 ││  │
│  │  │  Sources: [img1] [img2] [img3] (glass thumbs)  ││  │
│  │  │  [Edit ✏️] (glass IconButton w/ purple glow)    ││  │
│  │  └─────────────────────────────────────────────────┘│  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ⓘ This DNA influences all downstream generations.       │
└──────────────────────────────────────────────────────────┘
```

### Scene Images Step (Reels)

```
┌─ GLASS CARD ─────────────────────────────────────────────┐
│  SCENE IMAGES                                             │
│                                                           │
│  ┌─ glass card ──────┐    ┌─ glass card ──────┐          │
│  │ Scene 1: Hook (3s)│    │ Scene 2: Ctx (7s) │          │
│  │ ┌──────────────┐  │    │ ┌──────────────┐  │          │
│  │ │   [image]    │  │    │ │   [image]    │  │          │
│  │ │  (neon border│  │    │ │              │  │          │
│  │ │   if select) │  │    │ │              │  │          │
│  │ └──────────────┘  │    │ └──────────────┘  │          │
│  │ "A person..."     │    │ "Close-up of..."  │          │
│  │ [↻] [✏️↻]         │    │ [↻] [✏️↻]         │          │
│  │ (glass IconBtns   │    │ (glass IconBtns   │          │
│  │  w/ glow hover)   │    │  w/ glow hover)   │          │
│  └───────────────────┘    └───────────────────┘          │
│                                                           │
│  ┌─ glass card ──────┐    ┌─ glass card ──────┐          │
│  │ Scene 3: Core(12s)│    │ Scene 4: CTA (3s) │          │
│  │ ┌──────────────┐  │    │ ┌──────────────┐  │          │
│  │ │   [image]    │  │    │ │   [image]    │  │          │
│  │ └──────────────┘  │    │ └──────────────┘  │          │
│  │ "Split screen..." │    │ "Text overlay..."  │          │
│  │ [↻] [✏️↻]         │    │ [↻] [✏️↻]         │          │
│  └───────────────────┘    └───────────────────┘          │
│                                                           │
│  [↻ Retry All]  (glass btn)     [Accept All →] (gradient)│
└──────────────────────────────────────────────────────────┘
```

---

## 10. AI Prompt Strategy

### Viral DNA Extraction
```
System: You are a viral content analyst for social media.
User: [image(s) of viral content]
Prompt: Analyze this viral content. Extract:
  - dominant_colors: [{hex, name}] (3-5 colors)
  - visual_style: composition, lighting, aesthetic
  - content_format: structure (before/after, list, POV, tutorial)
  - text_style: text overlays, font feel, placement
  - mood: emotional tone
  - hook_pattern: what grabs attention
  - cta_pattern: how it closes
Return JSON.
```

### Content Generation (Step 4 — with DNA)
```
System: You are a social media content expert for {platform}.
{if dna: Match: Mood={dna.mood}, Format={dna.content_format}, Hook={dna.hook_pattern}, CTA={dna.cta_pattern}}
Input: Topic: "{topic}", Category: "{category}"
Output: 3 variants, each containing:
  - overlay_text: short punchy text to display ON the image (quote/hook/tip, max 10 words)
  - feed_caption: longer text posted below image in feed (with emojis + CTA)
  - hashtags: 8-15 relevant tags
→ JSON format: { "variants": [{ "overlay_text", "feed_caption", "hashtags" }] }
```

### Content Enhancement (retry with feedback)
```
Previous output: {previous_variants}
User feedback: "{enhancement}"
Generate 3 improved variants incorporating the feedback. Same JSON format.
```

### Image Compositing (Step 5 — Pillow, not AI)
```
Input: selected_overlay_text, background_image_path, dna.text_style
Process:
  1. DALL-E 3 generates clean background (prompt says "no text")
  2. Pillow opens background PNG
  3. Renders overlay_text with:
       - Font: bold sans-serif
       - Size: auto-scaled to image width
       - Color: contrasting to DNA primary color (white or black)
       - Position: center or lower-third (from DNA composition)
       - Drop shadow for readability
  4. Saves composited PNG to assets/
Output: final_image_path (what user sees + downloads)
```

### Image Prompt (with DNA)
```
System: Visual art director for social media.
{if dna: Match: Colors={dna.colors}, Style={dna.visual_style}, Mood={dna.mood}}
Input: Topic, Caption, Style preset, Dimensions
Output: DALL-E 3 optimized prompt
```

### Reel Script (with DNA)
```
System: Short-form video scriptwriter.
{if dna: Format={dna.content_format}, Hook={dna.hook_pattern}, Mood={dna.mood}, CTA={dna.cta_pattern}}
Input: Topic, Duration (seconds), Platform
Output: JSON { title, scenes: [{scene_number, duration, narration, visual_description, caption_overlay}] }
```

### Scene Image
```
System: Cinematographer for social media reel.
{if dna: Colors={dna.colors}, Style={dna.visual_style}, Mood={dna.mood}}
Input: Scene visual_description, narration context, aspect ratio
Output: DALL-E 3 prompt for the scene
```

---

## 11. FFmpeg Assembly Pipeline

### Why FFmpeg (Python) over Remotion/Node
- Native Python integration via `ffmpeg-python`
- No headless browser dependency
- Ken Burns, transitions, captions all supported via filter chains
- Works locally with zero cloud dependency
- Easy subprocess management in FastAPI

### Pipeline

```
Input: scene_images[] + audio_file + caption_data + transition_config

Step 1: Per-scene → Ken Burns video clip (zoompan)
Step 2: Add caption overlays (drawtext)
Step 3: Concatenate scenes with transitions (xfade)
Step 4: Mix voiceover + background music (amix)
Step 5: Output MP4 (H.264, 1080x1920)
```

---

## 12. Cost Estimate

### MVP-1 Costs (Per Content Piece)

| Action | API | Cost |
|---|---|---|
| Viral DNA (3 images) | GPT-4o Vision | ~$0.06 |
| Caption generation | GPT-4o | ~$0.01 |
| Trend lookup | TrendsAPI | Free (100/mo) |
| Image gen (4 options) | DALL-E 3 | ~$0.16 |
| TTS voiceover | Browser API | Free |
| FFmpeg assembly | Local | Free |
| **Image (no retries)** | | **~$0.23** |
| **Image (2 retries/step)** | | **~$0.69** |
| **Reel stitch (no retries)** | | **~$0.29** |
| **Reel stitch (2 retries/step)** | | **~$0.87** |

**With Ollama (local text) + DALL-E (cloud images)**: ~$0.16/image, ~$0.22/reel

---

## 13. MVP-1 Scope — IN vs OUT

### IN (MVP-1)
- [x] Image creation flow (6 steps)
- [x] Reel creation flow (8 steps) — stitch mode only (FFmpeg)
- [x] Viral DNA — auto-discover + manual upload
- [x] Viral DNA injection into all prompts
- [x] AI providers: OpenAI + Ollama
- [x] Retry + enhancement on every AI step
- [x] Attempt history browsing
- [x] Category selection + trend discovery (TrendsAPI)
- [x] AI caption + hashtag generation (GPT-4o)
- [x] AI image generation (DALL-E 3)
- [x] Scene image generation (per-scene, per-scene retry)
- [x] FFmpeg reel assembly (transitions + Ken Burns + captions)
- [x] TTS voiceover (Browser Web Speech API)
- [x] Background music (5-10 bundled tracks)
- [x] Step-back navigation with dependency invalidation
- [x] DB persistence (SQLite) — resume drafts
- [x] Export: PNG/JPG + MP4 + caption text
- [x] Settings page (OpenAI API key + Ollama config)
- [x] No auth — single user, local

### MVP-2 Additions
- [ ] AI video generation (text-to-video, image-to-video)
- [ ] Video providers: Kling 3.0, Veo 3.1, Runway Gen-4
- [ ] More AI providers: Anthropic, Google, ComfyUI, Replicate Flux
- [ ] Per-step provider override (gear icon)
- [ ] OpenAI TTS, ElevenLabs for voiceover
- [ ] Multi-platform resize/export
- [ ] Saved viral DNA templates

### Future (Phase 3+)
- [ ] User auth + multi-user
- [ ] Direct posting to social platforms
- [ ] Template library
- [ ] Canvas editor
- [ ] AI music generation
- [ ] Scheduling + Analytics

---

## 14. Project Structure

```
contentforge/
├── backend/                             # FastAPI (Python)
│   ├── app/
│   │   ├── main.py                      # FastAPI app entry
│   │   ├── config.py                    # Settings, env vars
│   │   ├── database.py                  # SQLAlchemy engine + session
│   │   ├── models/                      # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── project.py
│   │   │   ├── step.py
│   │   │   ├── attempt.py
│   │   │   ├── scene.py
│   │   │   ├── viral_dna.py
│   │   │   ├── asset.py
│   │   │   ├── provider_setting.py
│   │   │   └── category.py
│   │   ├── schemas/                     # Pydantic request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── project.py
│   │   │   ├── step.py
│   │   │   ├── attempt.py
│   │   │   ├── scene.py
│   │   │   ├── viral_dna.py
│   │   │   └── provider.py
│   │   ├── routers/                     # API route handlers
│   │   │   ├── __init__.py
│   │   │   ├── projects.py
│   │   │   ├── steps.py
│   │   │   ├── scenes.py
│   │   │   ├── viral_dna.py
│   │   │   ├── trends.py
│   │   │   ├── categories.py
│   │   │   ├── assembly.py
│   │   │   ├── export.py
│   │   │   └── settings.py
│   │   ├── services/                    # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── workflow.py              # State machine, step transitions
│   │   │   ├── retry.py                 # Retry/enhance prompt building
│   │   │   └── steps.py                 # Step configs per flow type
│   │   ├── ai/                          # AI provider layer
│   │   │   ├── __init__.py
│   │   │   ├── provider.py              # Factory: OpenAI + Ollama client
│   │   │   ├── text.py                  # Caption, script generation
│   │   │   ├── image.py                 # DALL-E 3 generation
│   │   │   ├── vision.py                # GPT-4o Vision (DNA analysis)
│   │   │   └── trends.py                # TrendsAPI integration
│   │   ├── viral_dna/                   # Viral DNA logic
│   │   │   ├── __init__.py
│   │   │   ├── discover.py              # Auto-discover viral content
│   │   │   ├── analyzer.py              # Vision AI analysis
│   │   │   └── injector.py              # Inject DNA into prompts
│   │   ├── media/                       # Video & audio processing
│   │   │   ├── __init__.py
│   │   │   ├── ffmpeg_assembler.py      # Ken Burns + transitions + captions
│   │   │   └── tts.py                   # TTS wrapper
│   │   └── seed.py                      # Category seed data
│   ├── assets/
│   │   └── music/                       # Royalty-free tracks
│   ├── data/
│   │   └── contentforge.db              # SQLite database (auto-created)
│   ├── requirements.txt
│   ├── .env
│   └── alembic/                         # DB migrations (optional)
│       └── versions/
│
├── frontend/                            # React + Vite
│   ├── public/
│   ├── src/
│   │   ├── main.tsx                     # App entry
│   │   ├── App.tsx                      # Router + Theme Provider
│   │   ├── theme.ts                     # MUI dark theme config
│   │   ├── api/                         # API client (axios/fetch)
│   │   │   ├── client.ts                # Base API config
│   │   │   ├── projects.ts
│   │   │   ├── steps.ts
│   │   │   ├── scenes.ts
│   │   │   ├── viralDna.ts
│   │   │   ├── trends.ts
│   │   │   └── settings.ts
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── ProjectPage.tsx          # Wizard
│   │   │   └── SettingsPage.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppHeader.tsx
│   │   │   │   └── AppLayout.tsx
│   │   │   ├── wizard/
│   │   │   │   ├── WizardLayout.tsx
│   │   │   │   ├── StepProgress.tsx     # MUI Stepper (custom gradient)
│   │   │   │   ├── StepNavigator.tsx
│   │   │   │   ├── AttemptBrowser.tsx
│   │   │   │   └── EnhanceInput.tsx
│   │   │   ├── steps/
│   │   │   │   ├── CategoryStep.tsx
│   │   │   │   ├── ViralDnaStep.tsx
│   │   │   │   ├── TrendsStep.tsx
│   │   │   │   ├── CaptionStep.tsx
│   │   │   │   ├── ImageStep.tsx
│   │   │   │   ├── ScriptStep.tsx
│   │   │   │   ├── SceneImagesStep.tsx
│   │   │   │   ├── AudioStep.tsx
│   │   │   │   ├── AssemblyStep.tsx
│   │   │   │   └── ReviewStep.tsx
│   │   │   ├── scenes/
│   │   │   │   ├── SceneCard.tsx
│   │   │   │   └── SceneGrid.tsx
│   │   │   ├── viral-dna/
│   │   │   │   ├── DnaProfile.tsx
│   │   │   │   └── DnaEditor.tsx
│   │   │   ├── preview/
│   │   │   │   ├── ImagePreview.tsx
│   │   │   │   └── ReelPreview.tsx
│   │   │   └── settings/
│   │   │       └── ProviderForm.tsx
│   │   ├── store/
│   │   │   └── wizardStore.ts           # Zustand
│   │   ├── hooks/
│   │   │   ├── useGenerate.ts           # SSE streaming hook
│   │   │   └── useProject.ts
│   │   └── types/
│   │       └── index.ts
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
└── README.md
```
