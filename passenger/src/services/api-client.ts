import {Env} from '../config/env';

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(body || `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

/** Register a handler (e.g. clear session) for HTTP 401 responses. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    token?: string | null;
    body?: unknown;
  } = {},
): Promise<T> {
  const method = options.method ?? (options.body !== undefined ? 'POST' : 'GET');
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${Env.apiBaseUrl}${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (e) {
    throw e instanceof TypeError
      ? e
      : new TypeError('Network request failed');
  }

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    throw new ApiError(res.status, text);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
