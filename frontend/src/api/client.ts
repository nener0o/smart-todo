import type { ParsePreview, Task, TaskCreate, TaskFilters, TaskStats, TaskUpdate, Token, User } from './types'

const TOKEN_KEY = 'smart_todo_token'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

type Listener = () => void
const unauthorizedListeners = new Set<Listener>()
export function onUnauthorized(listener: Listener) {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  const token = tokenStorage.get()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(path, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Сервер недоступен. Проверьте, что бэкенд запущен.')
  }

  if (response.status === 401) {
    tokenStorage.clear()
    unauthorizedListeners.forEach((l) => l())
  }

  if (!response.ok) {
    let message = `Ошибка ${response.status}`
    try {
      const body = await response.json()
      if (typeof body.detail === 'string') message = body.detail
      else if (Array.isArray(body.detail)) message = body.detail.map((d: { msg: string }) => d.msg).join('; ')
    } catch {
      /* тело не JSON */
    }
    throw new ApiError(response.status, message)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function query(params: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v) search.set(k, v)
  })
  const s = search.toString()
  return s ? `?${s}` : ''
}

export const api = {
  auth: {
    register: (data: { email: string; name: string; password: string }) =>
      request<Token>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request<Token>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request<User>('/api/auth/me'),
  },
  tasks: {
    list: (filters: TaskFilters) => request<Task[]>(`/api/tasks${query({ ...filters })}`),
    stats: () => request<TaskStats>('/api/tasks/stats'),
    categories: () => request<string[]>('/api/tasks/categories'),
    parse: (text: string) => request<ParsePreview>('/api/tasks/parse', { method: 'POST', body: JSON.stringify({ text }) }),
    create: (data: TaskCreate) => request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: TaskUpdate) =>
      request<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    toggle: (id: number) => request<Task>(`/api/tasks/${id}/toggle`, { method: 'POST' }),
    remove: (id: number) => request<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
  },
}
