from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.routers import auth
from app.core.db import db as database
from app.tasks.reminder_scheduler import start_scheduler

app = FastAPI(title="Festora API")

# CORS
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3100",
    "http://localhost:3101",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler — ensures CORS headers are set on ALL error responses.
# Without this, unhandled 500s bypass CORSMiddleware and the browser sees a CORS error
# instead of the real error message, making debugging very confusing.
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in origins:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
        headers=headers,
    )

# Startup/Shutdown
@app.on_event("startup")
async def startup_db_client():
    database.connect()
    # Create Indexes
    db = database.get_database()
    await db["registrations"].create_index("event_id")
    await db["registrations"].create_index("student_id")
    await db["teams"].create_index("event_id")
    await db["teams"].create_index([("event_id", 1), ("team_name", 1)], unique=True)
    
    # Start Reminder Scheduler
    start_scheduler()

@app.on_event("shutdown")
async def shutdown_db_client():
    database.close()

from fastapi.staticfiles import StaticFiles
import os

# Mount uploads
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include Routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
from app.routers import users
app.include_router(users.router, prefix="/users", tags=["Users"])
from app.routers import events
app.include_router(events.router, prefix="/events", tags=["Events"])
from app.routers import registrations
app.include_router(registrations.router, prefix="/registrations", tags=["Registrations"])
from app.routers import teams
app.include_router(teams.router, prefix="/teams", tags=["Teams"])
from app.routers import scores
app.include_router(scores.router, prefix="/scores", tags=["Scores"])
from app.routers import budgets
app.include_router(budgets.router, prefix="/budgets", tags=["Budgets"])
from app.routers import reports
app.include_router(reports.router, prefix="/reports", tags=["Reports"])
from app.routers import certificates
app.include_router(certificates.router, prefix="/certificates", tags=["Certificates"])
from app.routers import audit
app.include_router(audit.router, prefix="/audit", tags=["Audit"])
from app.routers import categories
app.include_router(categories.router, prefix="/categories", tags=["Categories"])

@app.get("/")
async def root():
    return {"message": "Welcome to Festora API"}
