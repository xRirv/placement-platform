import json

import pytest

from app.mq.consumers import ingestion_worker


class FakeRepository:
    def __init__(self, fail_persistence=False):
        self.statuses = []
        self.applied = 0
        self.fail_persistence = fail_persistence

    def update_raw_status(self, *args, **kwargs):
        self.statuses.append((args, kwargs))

    def fetch_raw_experience(self, experience_id):
        return {
            "experience_id": experience_id,
            "experience_text": "I interviewed at Microsoft. Round 1: Reverse a linked list?",
            "questions_summary": "DSA questions",
            "tips": "Practice daily",
            "questions": ["Reverse a linked list?"],
            "role": "SDE",
        }

    def find_exact(self, *args):
        return None

    def find_similar(self, *args):
        return []

    def apply_payload(self, payload):
        if self.fail_persistence:
            raise RuntimeError("persistence failed")
        self.applied += 1


class FakeChannel:
    def __init__(self):
        self.acks = []
        self.nacks = []

    def basic_ack(self, delivery_tag):
        self.acks.append(delivery_tag)

    def basic_nack(self, delivery_tag, requeue):
        self.nacks.append((delivery_tag, requeue))


class FakeMethod:
    delivery_tag = 7


def message(experience_id):
    return json.dumps({"experience_id": experience_id}).encode()


def test_worker_persists_before_ack_and_dry_run_does_not_persist(monkeypatch):
    repository = FakeRepository()
    channel = FakeChannel()
    monkeypatch.setattr(ingestion_worker, "SupabaseRepository", lambda: repository)
    monkeypatch.setattr(ingestion_worker.settings, "dry_run", False)

    ingestion_worker.process_message(channel, FakeMethod(), None, message("e2e-1"))

    assert repository.applied == 1
    assert channel.acks == [7]
    assert channel.nacks == []
    assert repository.statuses[0][0][1] == "PROCESSING"
    assert repository.statuses[-1][0][1] == "COMPLETED"

    repository.applied = 0
    channel.acks.clear()
    monkeypatch.setattr(ingestion_worker.settings, "dry_run", True)
    ingestion_worker.process_message(channel, FakeMethod(), None, message("dry-1"))

    assert repository.applied == 0
    assert channel.acks == [7]


def test_worker_marks_failure_and_nacks_without_ack(monkeypatch):
    repository = FakeRepository(fail_persistence=True)
    channel = FakeChannel()
    monkeypatch.setattr(ingestion_worker, "SupabaseRepository", lambda: repository)
    monkeypatch.setattr(ingestion_worker.settings, "dry_run", False)

    ingestion_worker.process_message(channel, FakeMethod(), None, message("failed-1"))

    assert channel.acks == []
    assert channel.nacks == [(7, False)]
    assert repository.statuses[-1][0][1] == "FAILED"
    assert repository.statuses[-1][1]["error"] == "persistence failed"
