from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router  # cite: 2

app = FastAPI()

# Enable CORS for browser requests (handles OPTIONS preflight automatically)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from local HTML files and any domain
    allow_credentials=True,
    allow_methods=["*"],  # Allows POST, GET, OPTIONS, etc.
    allow_headers=["*"],  # Allows all headers
)

# Mount your API router
app.include_router(api_router, prefix="/api/v1")