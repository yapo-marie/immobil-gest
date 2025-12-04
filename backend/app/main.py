from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from fastapi import UploadFile, File
import os
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title="LOCATUS API",
    description="API for LOCATUS Rental Management Platform",
    version="1.0.0",
    redirect_slashes=False,  # évite les redirections 307 qui suppriment l'en-tête Authorization côté navigateur
)

# CORS Configuration
origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:8081",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api import auth, properties, tenants, leases, payments, maintenance, notifications, reminders

app.include_router(auth.router)
app.include_router(properties.router)
app.include_router(tenants.router)
app.include_router(leases.router)
app.include_router(payments.router)
app.include_router(maintenance.router)
app.include_router(notifications.router)
app.include_router(reminders.router)

@app.get("/")
async def root():
    return {
        "message": "Welcome to LOCATUS API",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Endpoint simple d'upload (stockage local ./uploads)
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    filename = file.filename
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as buffer:
        buffer.write(await file.read())
    # Retourne une URL servie par FastAPI
    return {"url": f"/uploads/{filename}"}
