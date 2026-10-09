from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings as app_settings
from app.database import create_tables
from app.seed import seed_categories
from app.services.workflow import reconcile_existing_project_steps
from app.routers import projects, categories, viral_dna, export, scenes
from app.routers import settings as settings_router
from app.routers import steps


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed
    create_tables()
    seed_categories()
    reconcile_existing_project_steps()
    yield


app = FastAPI(
    title=app_settings.APP_NAME,
    lifespan=lifespan,
)

# CORS middleware — allow FE on :5173/:5174
app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated images/audio for the frontend to display
app.mount("/assets", StaticFiles(directory=app_settings.ASSETS_DIR), name="assets")

# Register routers
app.include_router(projects.router)
app.include_router(categories.router)
app.include_router(settings_router.router)
app.include_router(steps.router)
app.include_router(viral_dna.router)
app.include_router(export.router)
app.include_router(scenes.router)


@app.get("/")
def root():
    return {"app": app_settings.APP_NAME, "status": "running"}
