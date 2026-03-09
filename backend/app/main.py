from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, SessionLocal
from app.seeds.seed import run_seeds

app = FastAPI(
    title="Classroom API",
    description="Google Classroom Clone API",
    version="1.0.0",
)

# CORS - allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    print("🚀 Starting Classroom API...")
    is_fresh = init_db()  # returns True if DB was just created, False if already existed

    if is_fresh:
        # Only seed on a brand new database
        db = SessionLocal()
        try:
            run_seeds(db)
        finally:
            db.close()
    else:
        print("⏭️  Database exists — skipping init and seeding.")

    print("✅ Ready.\n")


@app.get("/")
def root():
    return {"message": "Classroom API is running ✅"}


@app.get("/health")
def health():
    return {"status": "ok"}