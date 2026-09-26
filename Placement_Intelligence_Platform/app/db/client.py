from supabase import create_client, Client

from app.core.config import settings

# Initialize the Supabase client from centralized config
supabase: Client = create_client(settings.supabase_url, settings.supabase_key)
