from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(
    title="LOCATUS API",
    description="API for LOCATUS Rental Management Platform",
    version="1.0.0",
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

from app.api import auth, properties, tenants, leases

app.include_router(auth.router)
app.include_router(properties.router)
app.include_router(tenants.router)
app.include_router(leases.router)

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
