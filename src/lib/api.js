/**
 * 統一的後端 API 呼叫包裝。
 *
 * - 一律走相對路徑 /api/*（dev 由 vite proxy、prod 由 nginx 反代）
 * - 一律帶 credentials: 'include'，讓 HttpOnly cookie 自動傳遞
 * - 後端錯誤格式：{ detail: 'CODE' } 或 { error, message }
 */

const BASE = '/api';

class ApiError extends Error {
  constructor(status, code, message, body) {
    super(message || code || `API error ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const init = {
    method,
    credentials: 'include',
    headers: {},
    signal,
  };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const code = data?.detail || data?.error || `HTTP_${res.status}`;
    const message = data?.message || code;
    throw new ApiError(res.status, code, message, data);
  }

  return data;
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return text; }
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

export { ApiError };
