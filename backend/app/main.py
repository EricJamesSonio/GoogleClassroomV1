import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import init_db
from app.routes.auth_routes import router as auth_router
from app.routes.class_routes import router as class_router
from app.routes.meeting_routes import router as meeting_router
from app.routes.chat_routes import router as chat_router
from app.scheduler.meeting_scheduler import scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.start()
    await init_db()
    yield
    scheduler.shutdown()


app = FastAPI(title="ClassRoom App API", version="1.0.0", lifespan=lifespan)

# ── CORS ──────────────────────────────────────────────────────
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:4173",
    "https://googleclassroomv1.onrender.com",  # production frontend
    
]

# Also allow any extra URL set via env
frontend_url = os.getenv("FRONTEND_URL", "").strip()
if frontend_url and frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(class_router)
app.include_router(meeting_router)
app.include_router(chat_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}