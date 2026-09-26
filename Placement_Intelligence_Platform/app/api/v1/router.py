from fastapi import APIRouter

from app.api.v1.endpoints import ingest, status

api_router = APIRouter()

# Register the ingestion and status-polling endpoints
api_router.include_router(ingest.router, tags=["ingest"])
api_router.include_router(status.router, tags=["status"])
