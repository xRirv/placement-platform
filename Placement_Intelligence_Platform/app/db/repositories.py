from sqlalchemy.orm import Session

from app.db.models import IngestionJob


def create_job(db: Session, raw_text: str) -> IngestionJob:
    job = IngestionJob(raw_text=raw_text)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def get_job(db: Session, job_id: str) -> IngestionJob | None:
    return db.get(IngestionJob, job_id)


def update_job(db: Session, job_id: str, **values: object) -> IngestionJob | None:
    job = get_job(db, job_id)
    if job is None:
        return None
    for key, value in values.items():
        setattr(job, key, value)
    db.commit()
    db.refresh(job)
    return job
