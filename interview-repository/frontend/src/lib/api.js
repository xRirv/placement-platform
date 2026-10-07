// Small fetch wrapper for Team A's backend with the Supabase JWT and readable errors.
export const createApi = (backendUrl, token) => {
  const request = async (method, path, body) => {
    let res;
    try {
      res = await fetch(`${backendUrl}${path}`, {
        method,
        headers: {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          Authorization: `Bearer ${token}`,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error('Cannot reach the server. Check that the backend is running and try again.');
    }
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 503) throw new Error('The AI service is currently unavailable. Please try again shortly.');
      throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
    }
    return data;
  };
  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body ?? {}),
    patch: (path, body) => request('PATCH', path, body ?? {}),
    put: (path, body) => request('PUT', path, body ?? {}),
    del: (path) => request('DELETE', path),
  };
};
