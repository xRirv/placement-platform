from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints import ingest
from app.core.config import settings


class FakeRepository:
    def __init__(self):
        self.upserts = []
        self.status_updates = []

    def upsert_raw_experience(self, row):
        self.upserts.append(row)

    def update_raw_status(self, experience_id, status, stage, error=None):
        self.status_updates.append((experience_id, status))


def make_client(monkeypatch):
    repository = FakeRepository()
    monkeypatch.setattr(ingest, "SupabaseRepository", lambda: repository)
    monkeypatch.setattr(ingest, "publish_experience_id", lambda experience_id: True)
    monkeypatch.setattr(settings, "internal_api_key", "test-key")
    app = FastAPI()
    app.include_router(ingest.router, prefix="/api/v1")
    return TestClient(app), repository


def test_ingest_rejects_missing_api_key(monkeypatch):
    client, repository = make_client(monkeypatch)
    response = client.post("/api/v1/internal/ingest", json={"experience_id": "e1"})
    assert response.status_code == 401
    assert repository.upserts == [] and repository.status_updates == []


def test_ingest_with_content_upserts_row(monkeypatch):
    client, repository = make_client(monkeypatch)
    response = client.post(
        "/api/v1/internal/ingest",
        headers={"X-Internal-Api-Key": "test-key"},
        json={
            "experience_id": "e1",
            "company_name": "Acme",
            "raw_content": "Two rounds.",
            "questions": [{"question_text": "Reverse a linked list"}],
        },
    )
    assert response.status_code == 202
    assert repository.upserts[0]["experience_id"] == "e1"
    assert repository.upserts[0]["company_name"] == "Acme"
    assert repository.status_updates == []


def test_ingest_without_content_requeues_existing_row(monkeypatch):
    client, repository = make_client(monkeypatch)
    response = client.post(
        "/api/v1/internal/ingest",
        headers={"X-Internal-Api-Key": "test-key"},
        json={"experience_id": "e1"},
    )
    assert response.status_code == 202
    assert repository.status_updates == [("e1", "QUEUED")]
    assert repository.upserts == []
