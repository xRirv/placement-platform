from fastapi import APIRouter
from app.api.v1.endpoints import ingest, status  # cite: 2

api_router = APIRouter()
api_router.include_router(ingest.router, tags=["ingest"])
api_router.include_router(status.router, tags=["status"])