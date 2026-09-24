from fastapi import APIRouter

from app.api.v1.endpoints import ingest, status

api_router = APIRouter()
api_router.include_router(ingest.router, prefix="/internal", tags=["ingestion"])
api_router.include_router(status.router, prefix="/internal", tags=["status"])
