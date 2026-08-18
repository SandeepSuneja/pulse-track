const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the API. Check that the backend is running.')
  }

  if (res.status === 204) return null

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = data.detail
    const message =
      typeof detail === 'string'
        ? detail
        : detail
          ? JSON.stringify(detail)
          : res.statusText || 'Request failed'
    throw new Error(message)
  }
  return data
}

export const api = {
  health: () => request('/api/health'),
  me: (token) => request('/api/users/me', { token }),
  updateMe: (token, body) => request('/api/users/me', { method: 'PATCH', token, body }),

  listTasks: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/tasks${qs ? `?${qs}` : ''}`, { token })
  },
  createTask: (token, body) => request('/api/tasks', { method: 'POST', token, body }),
  updateTask: (token, id, body) => request(`/api/tasks/${id}`, { method: 'PATCH', token, body }),
  deleteTask: (token, id) => request(`/api/tasks/${id}`, { method: 'DELETE', token }),

  listActivities: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/activities${qs ? `?${qs}` : ''}`, { token })
  },
  createActivity: (token, body) => request('/api/activities', { method: 'POST', token, body }),
  updateActivity: (token, id, body) =>
    request(`/api/activities/${id}`, { method: 'PATCH', token, body }),
  deleteActivity: (token, id) => request(`/api/activities/${id}`, { method: 'DELETE', token }),

  listGoals: (token) => request('/api/goals', { token }),
  createGoal: (token, body) => request('/api/goals', { method: 'POST', token, body }),
  updateGoal: (token, id, body) => request(`/api/goals/${id}`, { method: 'PATCH', token, body }),
  deleteGoal: (token, id) => request(`/api/goals/${id}`, { method: 'DELETE', token }),
  analytics: (token, period = 'week') => request(`/api/analytics/summary?period=${period}`, { token }),
}
