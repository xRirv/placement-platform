const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const API_BASE_URL = configuredBaseUrl.replace(/\/$/, '')

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(body?.detail || `Request failed with status ${response.status}`)
  }
  return body
}

export function submitExperience(experienceId) {
  return request('/api/v1/internal/ingest', {
    method: 'POST',
    body: JSON.stringify({ experience_id: experienceId }),
  })
}

export function fetchExperienceStatus(experienceId) {
  return request(`/api/v1/internal/experiences/${encodeURIComponent(experienceId)}`)
}

export function sendChatMessage(message, sessionId) {
  return request('/api/v1/agents/chat', {
    method: 'POST',
    body: JSON.stringify({ message, session_id: sessionId }),
  })
}

export function searchKnowledge(payload) {
  return request('/api/v1/search', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function requestPreparation(company, role, message) {
  return request('/api/v1/agents/preparation', {
    method: 'POST',
    body: JSON.stringify({ company, role, message }),
  })
}

export { API_BASE_URL }
