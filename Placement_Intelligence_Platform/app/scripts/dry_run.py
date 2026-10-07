import argparse
import logging
from dotenv import load_dotenv

from app.ai_pipeline.runner import run_pipeline
from app.ai_pipeline.stages.prepare import RawExperience
from app.db.repositories import SupabaseRepository
from app.mq.consumers.ingestion_worker import _combined_text

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("dry_run")
# In app/scripts/dry_run.py

def print_summary(payload):
    # Extract existing matched IDs from entity links
    matched_companies = [link.ref.existing_id for link in payload.experience_company_links if link.ref.existing_id]
    created_companies = [c.canonical_name for c in payload.companies_to_create]
    
    matched_roles = [link.ref.existing_id for link in payload.experience_role_links if link.ref.existing_id]
    created_roles = [r.canonical_name for r in payload.roles_to_create]

    created_rounds = [r.canonical_name for r in payload.rounds_to_create]

    logger.info("\n================ PIPELINE DRY RUN RESULT ================")
    logger.info(f"Experience ID     : {payload.experience_id}")
    logger.info(f"Matched Companies : {matched_companies}")
    logger.info(f"Created Companies : {created_companies}")
    logger.info(f"Matched Roles     : {matched_roles}")
    logger.info(f"Created Roles     : {created_roles}")
    logger.info(f"Created Rounds    : {created_rounds}")
    logger.info(f"Total Questions   : {len(payload.experience_question_links)}")
    logger.info("=========================================================")
def main():
    load_dotenv()
    parser = argparse.ArgumentParser(description="Dry run AI Pipeline on a real experience record.")
    parser.add_argument("--experience-id", required=True, help="Target experience_id from experiences table")
    args = parser.parse_args()

    repo = SupabaseRepository()
    logger.info(f"--- STARTING DRY RUN FOR EXPERIENCE: {args.experience_id} ---")

    # 1. Fetch raw data from Supabase
    raw_row = repo.fetch_raw_experience(args.experience_id)
    logger.info(f"Fetched raw record for company: {raw_row.get('company_name') or 'N/A'}")

    # 2. Map DB row to RawExperience domain model
    raw_experience = RawExperience(
        experience_id=raw_row["experience_id"],
        text=_combined_text(raw_row),
        company_hint=raw_row.get("company_name"),
        role_hint=raw_row.get("role_title"),
        interview_date=raw_row.get("interview_date"),
    )

    print("\n" + "="*50)
    print("--- [DEBUG] INPUT RAW EXPERIENCE CONTENT ---")
    print(raw_experience)
    print("="*50 + "\n")

    try:
        payload = run_pipeline(
            raw_experience,
            repository=repo,
        )
        print_summary(payload)
        
        # Log sample questions extracted
        for idx, q in enumerate(getattr(payload, 'questions', [])[:3], 1):
            logger.info(f"  Q{idx}: {getattr(q, 'canonical_text', q)}")

        logger.info("=========================================================")
        logger.info("DRY RUN SUCCESSFUL: No database modifications were committed.")

    except Exception:
        logger.exception("Dry run failed")

if __name__ == "__main__":
    main()