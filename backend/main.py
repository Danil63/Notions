from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from backend.middleware import UserIdMiddleware
from backend.routers import tasks, calendar, session
from backend.services.storage import init_storage

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_storage()
    yield


app = FastAPI(title="Notions API", lifespan=lifespan)

app.add_middleware(UserIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://notions-7u3j.onrender.com"],
    allow_credentials=True,
    allow_methods=["GET", "PUT", "PATCH"],
    allow_headers=["Content-Type"],
)

app.include_router(tasks.router, prefix="/api")
app.include_router(calendar.router, prefix="/api")
app.include_router(session.router, prefix="/api")

if STATIC_DIR.exists():

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str = ""):
        file_path = STATIC_DIR / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
