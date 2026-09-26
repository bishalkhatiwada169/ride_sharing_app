import { useAuthStore } from "@/stores/auth-store";

const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE = configuredBase
  ? configuredBase.replace(/\/$/, "")
  : "/api/v1";

type ApiErrorBody = {
  message?: string;
  code?: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const finalHeaders = new Headers(headers);
  finalHeaders.set("Content-Type", "application/json");

  if (auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    let code: string | undefined;
    try {
      const body = (await response.json()) as ApiErrorBody;
      if (body.message) message = body.message;
      code = body.code;
    } catch {
      // ignore non-JSON errors
    }
    throw new ApiError(response.status, message, code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
