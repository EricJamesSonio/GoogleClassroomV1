from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db.database import init_db
from app.routes.auth_routes import router as auth_router
from app.routes.class_routes import router as class_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="ClassRoom App API",
    version="1.0.0",
    lifespan=lifespan,
)

# ── Routers ──────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(class_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Server is running"}