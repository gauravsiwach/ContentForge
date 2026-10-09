# ContentForge

AI-powered social media content creation tool. Create viral image posts and reels through a guided wizard workflow.

## Project Structure

```
ContentForge/
├── backend/          # FastAPI + SQLAlchemy + SQLite
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── config.py         # Settings (env vars, DB URL, CORS)
│   │   ├── database.py       # SQLAlchemy engine + session
│   │   ├── seed.py           # Seed categories into DB
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── routers/          # API route handlers
│   │   └── services/         # Business logic (workflow, steps)
│   ├── requirements.txt
│   └── venv/                 # Python 3.11 virtual environment
├── frontend/         # React + Vite + MUI (Dark Glassmorphism)
│   ├── src/
│   │   ├── App.tsx            # Root component (ThemeProvider + Router)
│   │   ├── main.tsx           # Entry point
│   │   ├── theme/             # MUI glassmorphism theme + glass style helpers
│   │   ├── types/             # TypeScript type definitions
│   │   ├── store/             # Zustand state management
│   │   ├── api/               # Axios API client
│   │   ├── pages/             # Route pages (Home, Project, Settings)
│   │   └── components/        # UI components
│   │       ├── layout/        # AppLayout, AppHeader
│   │       ├── wizard/        # WizardLayout, StepProgress, StepNavigator
│   │       ├── steps/         # Step components (Category, placeholders)
│   │       └── preview/       # Preview panel
│   └── package.json
└── Docs/             # PRD + HLD documentation
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, MUI v9, Zustand, Axios, TypeScript |
| Backend | FastAPI, SQLAlchemy 2.0, SQLite, Pydantic v2, Python 3.11 |
| Theme | Dark Glassmorphism — frosted glass cards, neon glows, gradient accents |

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **Python** 3.11 (3.14 not supported by pydantic-core)
- **npm**

### 1. Clone & enter the project

```bash
cd ContentForge
```

### 2. Start the Backend

```bash
cd backend

# Create virtual environment (first time only)
python3.11 -m venv venv

# Activate venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install dependencies (first time only)
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload
```

The backend will start on **http://localhost:8000**.
- Swagger UI: http://localhost:8000/docs
- On first startup, tables are auto-created and categories are seeded.

### 3. Start the Frontend

Open a new terminal:

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

The frontend will start on **http://localhost:5173**.

### 4. Open the App

Visit **http://localhost:5173** in your browser. You should see:
- Dark glassmorphism theme with ambient purple/cyan background
- "New Image Post" and "New Reel" glass cards
- Clicking either starts a wizard with stepper navigation

## API Endpoints (Phase 1)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/api/projects` | Create a new project (image or reel) |
| `GET` | `/api/projects` | List all projects |
| `GET` | `/api/projects/:id` | Get project with steps |
| `PUT` | `/api/projects/:id` | Update project (category, platform, format) |
| `DELETE` | `/api/projects/:id` | Delete a project |
| `POST` | `/api/projects/:id/navigate` | Navigate to a step (with step-back invalidation) |
| `GET` | `/api/categories` | List seeded categories |

## Development

### Backend

```bash
cd backend && source venv/bin/activate

# Run server with auto-reload
uvicorn app.main:app --reload

# Seed categories manually (if needed)
python -m app.seed
```

### Frontend

```bash
cd frontend

# Dev server with HMR
npm run dev

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

### Environment Variables

Create `backend/.env` (optional):

```env
DATABASE_URL=sqlite:///./contentforge.db
CORS_ORIGINS=["http://localhost:5173","http://localhost:5174"]
DEBUG=true
```

Create `frontend/.env` (optional):

```env
VITE_API_URL=http://localhost:8000
```

## Current Status

**Phase 1: Skeleton** — Complete (BE + FE)

See [Docs/contentforge-hld.md](Docs/contentforge-hld.md) Section 9 for detailed implementation log.
