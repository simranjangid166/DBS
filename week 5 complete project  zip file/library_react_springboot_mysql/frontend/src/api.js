const API = 'http://localhost:8080/api'

async function request(path, options = {}) {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API}${path}`, { ...options, headers })
  const text = await response.text()
  let data = {}
  try { data = text ? JSON.parse(text) : {} } catch { data = { error: text } }
  if (!response.ok) throw new Error(data.error || data.message || 'Request failed')
  return data
}

export const api = {
  register: data => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: data => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  addBook: data => request('/books', { method: 'POST', body: JSON.stringify(data) }),
  search: q => request(`/books/search?q=${encodeURIComponent(q)}&limit=10`)
}
