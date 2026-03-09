from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="ClassRoom App API",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db.database import init_db
from app.routes.auth_routes import router as auth_router


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


@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Server is running"}
async def health_check():
    return {"status": "ok", "message": "Server is running"}