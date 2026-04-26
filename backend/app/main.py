# backend/app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import search, places, jobs
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Mapa Empresas API")

_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
_origins = [o.strip() for o in _origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api")
app.include_router(places.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
