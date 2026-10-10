# ContentForge

ContentForge is a local-first AI workspace for creating social-media content. It guides a project through category selection, Viral DNA discovery, trend ideas, copy, image generation, and final review in one workflow.

The goal is to create content on your own machine without requiring a paid API. Text and optional vision analysis run through [Ollama](https://ollama.com/); image generation runs through [ComfyUI](https://www.comfy.org/) using the bundled **Z-Image Turbo** API workflow. Project data is stored locally in SQLite and generated images are saved locally by the backend.

> The app still contains optional cloud-provider support, but the setup below uses only local services and does not need an API key.

## How the local workflow works

```text
Browser (React / Vite, :5173)
             |
             v
ContentForge API (FastAPI, :8000) ──> SQLite + local assets
             |                         (backend/contentforge.db, backend/assets/)
             |
             +──> Ollama (:11434) — text and vision
             |
             +──> ComfyUI (:8188) — Z-Image Turbo image generation
```

For image projects, ContentForge injects the generated image prompt into [`backend/app/workflows/z_image_turbo_api.json`](backend/app/workflows/z_image_turbo_api.json), submits it to ComfyUI, waits for the result, then saves a copy under `backend/assets/` for the project to display and export.

## Features

- Guided workflow for image posts and the foundation for reels
- Local AI provider settings for text, vision, and images
- Ollama-backed text generation and optional vision analysis
- Viral DNA profile to carry visual style, mood, hooks, and CTA style into later steps
- ComfyUI image generation with live progress where ComfyUI provides it
- Local SQLite storage, generated asset storage, and project export

## Multiple posts in one project (backend foundation)

Projects can own multiple post records while keeping category and Viral DNA as shared project settings. Each post has its own workflow-step state. The current backend endpoints are:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/projects/{project_id}/posts` | Create the next post in a project (no request body required) |
| `GET` | `/api/projects/{project_id}/posts` | List posts ordered by post number |
| `GET` | `/api/projects/{project_id}/trends` | List the project's shared trend pool and current post usage |
| `POST` | `/api/projects/{project_id}/trends/generate` | Generate and append unique trend candidates to the project pool |
| `GET` | `/api/projects/{project_id}/trends/usage` | List selected trend topics and the posts that used them |
| `GET` | `/api/posts/{post_id}` | Load a post and its post-scoped steps |
| `POST` | `/api/posts/{post_id}/navigate` | Navigate the post workflow using `{ "target_step": "caption", "skip_current": false }` |
| `POST` | `/api/posts/{post_id}/complete` | Complete one post after its own workflow reaches review; the project is completed only when all posts are completed |
| `PUT` | `/api/posts/{post_id}/trend` | Set or clear the post's selected project trend using `{ "trend_id": "..." }` (send `null` to clear) |

Trend candidates belong to the project and are deduplicated when more are generated. Each post stores a stable trend selection; a trend is available again when no post currently selects it. Existing generated trend attempts and selections are backfilled additively at startup. Generation continues to use `/api/steps/{step_id}` for existing workflow actions. Passing the step ID returned inside a post scopes its generation attempts, selected output, caption context, and visual generation to that post. Project category and Viral DNA remain shared. Reel scene generation has post-scoped persistence, but its scene-management HTTP routes remain project-scoped and will need a follow-up before multi-post reels are ready.

For image projects, Finish is post-scoped: finishing one post preserves its completed state without marking sibling posts complete. Adding a new post reopens the aggregate project status; the project returns to `completed` only after every post is completed.

## Requirements

- Node.js 18+
- Python 3.11+
- [Ollama](https://ollama.com/) running locally
- [ComfyUI](https://www.comfy.org/) running locally for image generation
- A machine with enough RAM/VRAM for the Ollama model and Z-Image Turbo model you choose

## Setup 1 — Run ContentForge

### 1. Clone and enter the repository

```bash
git clone <your-repository-url>
cd ContentForge
```

### 2. Start Ollama

Install Ollama, then download at least one text model. Use the model name you download later in ContentForge Settings.

```bash
ollama serve
ollama pull gemma3:4b
```

`ollama serve` is unnecessary if the Ollama desktop app/service is already running. Confirm that it is reachable:

```bash
curl http://127.0.0.1:11434/v1/models
```

For optional local vision analysis, pull and configure an Ollama vision-capable model as well. If no vision model is configured, the Viral DNA step uses its built-in fallback profile instead of a paid vision API.

### 3. Start the backend

Open a terminal:

```bash
cd backend

# First time only
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start FastAPI
uvicorn app.main:app --reload
```

The backend starts at [http://localhost:8000](http://localhost:8000).

- API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Local database: `backend/contentforge.db`
- Generated assets: `backend/assets/`

On first launch the database tables and default content categories are created automatically.

### 4. Start the frontend

Open a second terminal from the repository root:

```bash
cd frontend

# First time only
npm install

# Start Vite
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 5. Configure local providers in the app

Open **Settings** in ContentForge and set each provider to **Local**:

| Task | Provider | Base URL | Model |
|---|---|---|---|
| Text | Ollama | `http://127.0.0.1:11434` | Your installed text model, e.g. `gemma3:4b` |
| Vision | Ollama | `http://127.0.0.1:11434` | Your installed vision model, if used |
| Image | ComfyUI | `http://127.0.0.1:8188` | Not required; the saved workflow selects Z-Image Turbo |

Use **Test connection** for each provider. The image-provider test calls ComfyUI's `/system_stats` endpoint.

## Setup 2 — Install and configure ComfyUI for Z-Image Turbo

ContentForge talks to ComfyUI's local API. It expects ComfyUI at `http://127.0.0.1:8188` and ships an API-format workflow at [`backend/app/workflows/z_image_turbo_api.json`](backend/app/workflows/z_image_turbo_api.json).

### 1. Install and start ComfyUI

Install ComfyUI Desktop or a local ComfyUI installation, then start it. Keep it running while you generate images in ContentForge.

Verify the server:

```bash
curl http://127.0.0.1:8188/system_stats
```

If you run ComfyUI on another host or port, add this to `backend/.env` before starting the backend:

```env
COMFYUI_BASE_URL=http://127.0.0.1:8188
```

### 2. Install the model files required by the saved workflow

The included Z-Image Turbo workflow expects these files in the corresponding ComfyUI model folders:

| Required file | ComfyUI folder |
|---|---|
| `z_image_turbo_bf16.safetensors` | `models/diffusion_models/` |
| `qwen_3_4b.safetensors` | `models/text_encoders/` |
| `ae.safetensors` | `models/vae/` |

Download compatible Z-Image Turbo model components from their official model source, place them in those folders, then restart ComfyUI. The workflow uses core ComfyUI nodes: `UNETLoader`, `CLIPLoader`, `VAELoader`, `KSampler`, `VAEDecode`, and `SaveImage`.

### 3. Verify the workflow in ComfyUI before using ContentForge

1. Open ComfyUI.
2. Load the Z-Image Turbo workflow you tested in ComfyUI, or import the repository workflow file.
3. Enter a short prompt and run it once in ComfyUI.
4. Confirm an image is produced without missing-node or missing-model errors.
5. Export/save the workflow in **API format** if you make changes, then replace `backend/app/workflows/z_image_turbo_api.json`.

ContentForge currently injects its prompt into workflow node `57:27` and reads the first `SaveImage` output. If you replace the workflow with one that changes those nodes, update [`backend/app/ai/comfyui_client.py`](backend/app/ai/comfyui_client.py) to match the new prompt node and output behavior.

### 4. Test from ContentForge

1. In ContentForge Settings, set **Image** to **ComfyUI (local)** with base URL `http://127.0.0.1:8188`.
2. Click **Test connection**.
3. Create an Image Post project and proceed to the Image step.
4. Generate one image. ContentForge queues the workflow in ComfyUI, monitors completion, and copies the generated image into `backend/assets/`.

## Configuration

Create `backend/.env` only if you need to override defaults:

```env
DATABASE_URL=sqlite:///./contentforge.db
CORS_ORIGINS=["http://localhost:5173","http://localhost:5174"]
COMFYUI_BASE_URL=http://127.0.0.1:8188
DEBUG=true
```

Optional frontend override in `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

## Local troubleshooting

| Symptom | Check |
|---|---|
| Ollama connection fails | Run `ollama serve` (or start Ollama Desktop), then check `http://127.0.0.1:11434/v1/models`. |
| ComfyUI connection fails | Start ComfyUI and check `curl http://127.0.0.1:8188/system_stats`. |
| ComfyUI has missing model errors | Verify the three filenames and folders listed above, then restart ComfyUI. |
| Image remains queued | Open ComfyUI and inspect its queue/errors; ContentForge only waits for the local workflow response. |
| A custom workflow does not receive the prompt | Ensure the prompt node ID in `comfyui_client.py` matches your API workflow. |

## Project structure

```text
ContentForge/
├── backend/
│   ├── app/
│   │   ├── ai/           # Ollama, ComfyUI, text, vision, and image clients
│   │   ├── routers/      # FastAPI endpoints
│   │   ├── services/     # Workflow and step state
│   │   └── workflows/    # Saved ComfyUI API workflow
│   ├── assets/           # Generated local media
│   └── contentforge.db   # Local SQLite database (created at runtime)
├── frontend/             # React + Vite UI
└── Docs/                 # Product and architecture notes
```

## Development commands

```bash
# Backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload

# Frontend
cd frontend
npm run dev
```
