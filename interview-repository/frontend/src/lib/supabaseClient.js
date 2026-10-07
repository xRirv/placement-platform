import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const DEFAULT_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export function getStoredConfig() {
  // Purge any legacy demo overrides from previous sessions
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sb_override_url');
    localStorage.removeItem('sb_override_anon_key');
  }

  const url = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && url.startsWith('http')),
    isCustom: false,
  };
}

let activeClient = null;
let activeUrl = '';
let activeKey = '';

export function getSupabaseClient() {
  const config = getStoredConfig();

  // If already initialized with matching config, reuse
  if (activeClient && activeUrl === config.url && activeKey === config.anonKey) {
    return activeClient;
  }

  activeClient = createClient(config.url, config.anonKey, {
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

export function saveCustomConfig() {
  // No-op for backwards compatibility
}

export function resetToEnvConfig() {
  activeClient = null;
}

/**
 * Dynamically resolves backend base URL. If accessed from a mobile or tablet on the same Wi-Fi,
 * it points to the host machine's IP instead of trying to resolve localhost on the mobile device.
 */
export function getBackendBase() {
  const envBackend = import.meta.env.VITE_BACKEND_URL;
  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://${window.location.hostname}:8080`;
  }
  return envBackend || 'http://localhost:8080';
}

/**
 * Sync the authenticated Supabase user profile with the Spring Boot backend
 * (POST /api/auth/sync with Bearer JWT)
 */
export async function syncUserWithBackend(accessToken, preferredName) {
  const backendBase = getBackendBase();
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

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Could not connect to backend server (${backendBase}): ${message}`,
    };
  }
}

/**
 * Fetch current user profile with role from the Spring Boot backend
 * (GET /api/auth/me with Bearer JWT)
 */
export async function fetchCurrentUserProfile(accessToken) {
  const backendBase = getBackendBase();
  const url = new URL('/api/auth/me', backendBase);

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { success: false, error: `Backend status ${res.status}: ${errorText}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Could not connect to backend server (${backendBase}): ${message}`,
    };
  }
}
