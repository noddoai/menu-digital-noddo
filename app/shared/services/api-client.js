/**
 * Cliente HTTP centralizado para toda la app (Vanilla ES Modules).
 * Normaliza URL base, método, headers (Content-Type + Bearer JWT), timeout,
 * serialización de body y manejo uniforme de respuestas/errores.
 */

export const API_BASE_URL = window.LOCATION_API_URL || `${window.location.origin}/api/v1`;
export const AUTH_TOKEN_STORAGE_KEY = 'aura_auth_token_v1';

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function buildUrl(endpoint) {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function parseResponseBody(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }
  const text = await response.text().catch(() => '');
  return text || null;
}

/**
 * Ejecuta una petición HTTP contra la API REST (/api/v1/...).
 *
 * @param {string} endpoint - Ruta relativa (ej: '/public/menus/gourmet-bistro') o URL absoluta.
 * @param {object} [options]
 * @param {string} [options.method='GET'] - Método HTTP.
 * @param {any} [options.body] - Payload; los objetos planos se serializan a JSON automáticamente.
 * @param {Record<string, string>} [options.headers] - Headers extra o para sobrescribir los defaults.
 * @param {boolean} [options.auth=true] - Adjunta Authorization Bearer si hay token guardado.
 * @param {RequestCache} [options.cache] - Política de caché de fetch (ej: 'no-store').
 * @param {number} [options.timeoutMs] - Timeout en ms si no se pasa signal explícito.
 * @param {AbortSignal} [options.signal] - AbortSignal personalizado.
 * @returns {Promise<any>} Cuerpo JSON/texto devuelto por la API.
 */
export async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    auth = true,
    cache,
    timeoutMs,
    signal
  } = options;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const token = auth ? getAuthToken() : null;

  const finalHeaders = {
    ...(!isFormData && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers
  };

  const fetchOptions = {
    method: method.toUpperCase(),
    headers: finalHeaders,
    ...(cache ? { cache } : {})
  };

  if (body !== undefined && fetchOptions.method !== 'GET' && fetchOptions.method !== 'HEAD') {
    fetchOptions.body = isFormData || typeof body === 'string' ? body : JSON.stringify(body);
  }

  if (signal) {
    fetchOptions.signal = signal;
  } else if (timeoutMs && typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    fetchOptions.signal = AbortSignal.timeout(timeoutMs);
  }

  const response = await fetch(buildUrl(endpoint), fetchOptions);
  const data = await parseResponseBody(response);

  if (!response.ok) {
    const errorMessage = (data && (data.error || data.message)) || `Error HTTP ${response.status}`;
    throw new ApiError(errorMessage, response.status, data);
  }

  return data;
}

export const apiClient = {
  get: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options = {}) => apiRequest(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'DELETE' })
};
