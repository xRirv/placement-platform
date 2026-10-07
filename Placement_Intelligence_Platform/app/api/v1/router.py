from fastapi import APIRouter

from app.api.v1.endpoints import ingest, status
from app.api.v1.endpoints import agents as agents_ep
from app.api.v1.endpoints import search as search_ep

api_router = APIRouter()

api_router.include_router(ingest.router, tags=["ingest"])
api_router.include_router(status.router, tags=["status"])
api_router.include_router(agents_ep.router, tags=["agents"])
api_router.include_router(search_ep.router, tags=["search"])
