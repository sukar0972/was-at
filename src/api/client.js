const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function getToken() {
  return localStorage.getItem('vt_token');
}

async function apiRequest(method, endpoint, body) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('vt_token');
    localStorage.removeItem('vt_user');
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// Auth
export async function login(username, password) {
  const result = await apiRequest('POST', '/api/auth/login', { username, password });
  localStorage.setItem('vt_token', result.token);
  localStorage.setItem('vt_user', JSON.stringify(result.user));
  return result;
}

export function logout() {
  localStorage.removeItem('vt_token');
  localStorage.removeItem('vt_user');
}

export function getCurrentUser() {
  const user = localStorage.getItem('vt_user');
  return user ? JSON.parse(user) : null;
}

export async function fetchMe() {
  return apiRequest('GET', '/api/auth/me');
}

// Locations
export async function fetchLocations() {
  return apiRequest('GET', '/api/locations');
}

export async function createLocation(data) {
  return apiRequest('POST', '/api/locations', data);
}

export async function updateLocation(id, data) {
  return apiRequest('PUT', `/api/locations/${id}`, data);
}

export async function deleteLocation(id) {
  return apiRequest('DELETE', `/api/locations/${id}`);
}

// Visits
export async function fetchVisits({ start, end }) {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  return apiRequest('GET', `/api/visits?${params}`);
}

export async function fetchVisitStats({ viewMode, currentDate }) {
  const params = new URLSearchParams();
  if (viewMode) params.set('viewMode', viewMode);
  if (currentDate) {
    params.set('year', currentDate.getFullYear());
    params.set('month', currentDate.getMonth());
  }
  return apiRequest('GET', `/api/visits/stats?${params}`);
}

// Admin
export async function fetchAdminUsers() {
  return apiRequest('GET', '/api/admin/users');
}

export async function createAdminUser(data) {
  return apiRequest('POST', '/api/admin/users', data);
}

export async function updateAdminUser(id, data) {
  return apiRequest('PUT', `/api/admin/users/${id}`, data);
}

export async function deleteAdminUser(id) {
  return apiRequest('DELETE', `/api/admin/users/${id}`);
}

// API Tokens
export async function fetchTokens() {
  return apiRequest('GET', '/api/tokens');
}

export async function createToken(name) {
  return apiRequest('POST', '/api/tokens', { name });
}

export async function deleteToken(id) {
  return apiRequest('DELETE', `/api/tokens/${id}`);
}

// Profile
export async function updateProfile(data) {
  return apiRequest('PUT', '/api/profile', data);
}
