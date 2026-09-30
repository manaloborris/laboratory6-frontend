const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');

let accessToken = '';
let refreshToken = '';

export function setTokens(tokens) {
  accessToken = tokens?.access_token || '';
  refreshToken = tokens?.refresh_token || '';
}

export function clearTokens() {
  accessToken = '';
  refreshToken = '';
}

async function send(path, options = {}, mayRefresh = true) {
  const headers = new Headers({ Accept: 'application/json' });
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (options.auth !== false && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new Error(`Cannot reach the API at ${API_URL}. Check that LavaLust is running.`);
  }

  const payload = await response.json().catch(() => ({}));

  if (response.status === 401 && mayRefresh && refreshToken && path !== '/api/auth/refresh') {
    try {
      const refreshed = await send('/api/auth/refresh', {
        method: 'POST',
        body: { refresh_token: refreshToken },
        auth: false,
      }, false);
      setTokens(refreshed.tokens);
      return send(path, options, false);
    } catch {
      clearTokens();
    }
  }

  if (!response.ok) {
    const error = new Error(payload.error || payload.message || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  return payload;
}

export const api = {
  login: (body) => send('/api/auth/login', { method: 'POST', body, auth: false }),
  register: (body) => send('/api/auth/register', { method: 'POST', body, auth: false }),
  logout: () => send('/api/auth/logout', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  }),
  products: () => send('/api/products'),
  createProduct: (body) => send('/api/products', { method: 'POST', body }),
  updateProduct: (id, body) => send(`/api/products/${id}`, { method: 'PUT', body }),
  deleteProduct: (id) => send(`/api/products/${id}`, { method: 'DELETE' }),
};