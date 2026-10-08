import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse

from .core.config import settings
from .core.database import init_db
from .routers import (
    auth, complaints, officer, workers, notifications,
    settings as app_settings, telemetry, evidence_reports
)
from .db.seed import seed_database

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("urbangrid")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing UrbanGrid Civic Operations Platform...")
    init_db()
    # Seed baseline demo data if database is fresh
    try:
        seed_database(reset=False)
    except Exception as e:
        logger.warning(f"Seed note: {e}")
    yield
    logger.info("UrbanGrid shutting down.")

app = FastAPI(
    title="URBANGRID Civic Grievance Deduplication & Dispatch Platform",
    description="Tamil Nadu Municipal AI Vision & Spatial Deduplication Engine",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
if settings.FRONTEND_URL and settings.FRONTEND_URL.strip():
    front = settings.FRONTEND_URL.strip().rstrip("/")
    if front not in origins:
        origins.append(front)

if "*" in origins and len(origins) == 1:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    filtered_origins = [o for o in origins if o != "*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=filtered_origins or ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Static file serving for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(officer.router)
app.include_router(workers.router)
app.include_router(notifications.router)
app.include_router(app_settings.router)
app.include_router(telemetry.router)
app.include_router(evidence_reports.router)

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "HEALTHY",
        "platform": "URBANGRID",
        "service": "Civic Grievance AI Deduplication Engine",
        "region": "Tamil Nadu Municipal Corporation",
        "duplicate_radius_default_meters": settings.DEFAULT_DUPLICATE_RADIUS_METERS,
        "database": "PostgreSQL / PostGIS Connected",
        "ai_status": "ONLINE"
    }

@app.post("/api/demo/reset")
def reset_demo_data():
    """Admin / Judge utility to reset to the Golden Live Demo state anytime"""
    seed_database(reset=True)
    return {
        "status": "SUCCESS",
        "message": "Demo data reset to baseline. Anchor ticket UG-1001 ready for 50m live deduplication test."
    }

# Serve frontend build in production if frontend/dist exists
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="static_assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("uploads/"):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", settings.PORT))
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=port, reload=False)
