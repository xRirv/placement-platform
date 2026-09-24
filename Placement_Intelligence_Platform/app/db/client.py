import os
from supabase import create_client, Client

# Get these from your Supabase Dashboard -> Project Settings -> API
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "your-anon-or-service-role-key")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)