import type { Lead, PublicPayload, SiteContent, Brand, Category, Machine } from '../types'

const TOKEN_KEY = 'buytech_admin_token'

/** Works on nginx/Plesk without Apache rewrite: /api/public → HTML, /api/index.php/public → JSON */
const API_BASE = '/api/index.php'

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, options: RequestInit = {}, auth = false): Promise<T> {
  const headers = new Headers(options.headers || {})
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (auth) {
    const token = getAdminToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  const response = await fetch(url, { ...options, headers })
  const text = await response.text()
  let data: { error?: string } & T
  try {
    data = (text ? JSON.parse(text) : {}) as { error?: string } & T
  } catch {
    throw new Error(
      'API не отвечает (пришёл HTML вместо JSON). Проверьте, что на хостинге залита папка api/ из dist/.',
    )
  }
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  return data
}

export const api = {
  getPublic: () => request<PublicPayload>('/public'),
  createLead: (payload: { name: string; phone: string; email?: string; need?: string }) =>
    request<{ lead: Lead }>('/leads', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (username: string, password: string) =>
    request<{ token: string }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request('/admin/logout', { method: 'POST' }, true),
  getLeads: () => request<Lead[]>('/admin/leads', {}, true),
  updateLead: (id: string, status: string) =>
    request<Lead>(`/admin/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, true),
  deleteLead: (id: string) =>
    request(`/admin/leads/${id}`, { method: 'DELETE' }, true),
  saveContent: (content: SiteContent) =>
    request<SiteContent>('/admin/content', {
      method: 'PUT',
      body: JSON.stringify(content),
    }, true),
  createBrand: (name: string) =>
    request<Brand>('/admin/brands', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }, true),
  updateBrand: (id: string, name: string) =>
    request<Brand>(`/admin/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }, true),
  deleteBrand: (id: string) =>
    request(`/admin/brands/${id}`, { method: 'DELETE' }, true),
  createCategory: (payload: Partial<Category>) =>
    request<Category>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, true),
  updateCategory: (id: string, payload: Partial<Category>) =>
    request<Category>(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, true),
  deleteCategory: (id: string) =>
    request(`/admin/categories/${id}`, { method: 'DELETE' }, true),
  createMachine: (payload: Partial<Machine>) =>
    request<Machine>('/admin/machines', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, true),
  updateMachine: (id: string, payload: Partial<Machine>) =>
    request<Machine>(`/admin/machines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, true),
  deleteMachine: (id: string) =>
    request(`/admin/machines/${id}`, { method: 'DELETE' }, true),
  upload: async (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<{ url: string }>('/admin/upload', { method: 'POST', body }, true)
  },
}
