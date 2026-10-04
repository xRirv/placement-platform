import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'sb_override_url';
const STORAGE_KEY_KEY = 'sb_override_anon_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  isCustom: boolean;
}

export function getStoredConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;

  const url = (storedUrl || envUrl).trim();
  const anonKey = (storedKey || envKey).trim();

  const isPlaceholder =
    !url ||
    url.includes('placeholder') ||
    !anonKey ||
    anonKey.includes('placeholder');

  return {
    url,
    anonKey,
    isConfigured: !isPlaceholder && url.startsWith('http'),
    isCustom: Boolean(storedUrl || storedKey),
  };
}

let activeClient: SupabaseClient | null = null;
let activeUrl = '';
let activeKey = '';

export function getSupabaseClient(): SupabaseClient {
  const config = getStoredConfig();

  // If already initialized with matching config, reuse
  if (activeClient && activeUrl === config.url && activeKey === config.anonKey) {
    return activeClient;
  }

  // Fallback valid dummy URL to prevent createClient crash if unconfigured
  const safeUrl = config.isConfigured ? config.url : 'https://placeholder-project.supabase.co';
  const safeKey = config.isConfigured
    ? config.anonKey
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_unconfigured_state';

  activeClient = createClient(safeUrl, safeKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  activeUrl = config.url;
  activeKey = config.anonKey;

  return activeClient;
}

export function saveCustomConfig(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  activeClient = null; // force re-creation
}

export function resetToEnvConfig(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
  activeClient = null; // force re-creation
}

/**
 * Sync the authenticated Supabase user profile with the Spring Boot backend
 * (POST /api/auth/sync with Bearer JWT)
 */
export async function syncUserWithBackend(
  accessToken: string,
  preferredName?: string
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  const backendBase = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
  const url = new URL('/api/auth/sync', backendBase);
  if (preferredName) {
    url.searchParams.set('preferredName', preferredName);
  }

  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, error: `Backend sync status ${res.status}: ${errorText}` };
    }

    const data = (await res.json()) as Record<string, unknown>;
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Could not connect to backend server (${backendBase}): ${message}`,
    };
  }
}
