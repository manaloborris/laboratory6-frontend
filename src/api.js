const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');

const sessionKey = {
  accessToken: 'borrisstock_access_token',
  refreshToken: 'borrisstock_refresh_token',
  user: 'borrisstock_user',
};

function readSessionValue(key) {
  try {
    return window.sessionStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

function writeSessionValue(key, value) {
  try {
    if (value) window.sessionStorage.setItem(key, value);
    else window.sessionStorage.removeItem(key);
  } catch {
    return;
  }
}

let accessToken = readSessionValue(sessionKey.accessToken);
let refreshToken = readSessionValue(sessionKey.refreshToken);

export function setTokens(tokens) {
  accessToken = tokens?.access_token || '';
  refreshToken = tokens?.refresh_token || '';
  writeSessionValue(sessionKey.accessToken, accessToken);
  writeSessionValue(sessionKey.refreshToken, refreshToken);
}

export function clearTokens() {
  accessToken = '';
  refreshToken = '';
  writeSessionValue(sessionKey.accessToken, '');
  writeSessionValue(sessionKey.refreshToken, '');
  writeSessionValue(sessionKey.user, '');
}

export function setStoredUser(user) {
  writeSessionValue(sessionKey.user, user ? JSON.stringify(user) : '');
}

export function getStoredUser() {
  try {
    return JSON.parse(readSessionValue(sessionKey.user) || 'null');
  } catch {
    return null;
  }
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