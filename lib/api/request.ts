import { authHeader } from "@/utils/token";
import { API_BASE_URL as BASE } from "@/lib/api/config";

interface ApiErrorHandlers {
  onUnauthorized?: () => void;
  onForbidden?: (message: string) => void;
}
let apiErrorHandlers: ApiErrorHandlers = {};
export function setApiErrorHandlers(handlers: ApiErrorHandlers) {
  apiErrorHandlers = handlers;
  return () => { if (apiErrorHandlers === handlers) apiErrorHandlers = {}; };
}

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number, public readonly fieldErrors: Record<string, string> = {}, public readonly code?: string) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  config: { base?: string } = {},
): Promise<T> {
  // `base: ""` forces a same-origin call — used for endpoints that only exist
  // as Next.js route handlers (e.g. document upload does S3 here, the NestJS
  // backend has no such route), so they must not be redirected to NEXT_PUBLIC_API_URL.
  const url = `${config.base ?? BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeader(), ...(options.headers ?? {}) },
  });
  const text = await res.text();
  let body: unknown;
  try { body = text ? JSON.parse(text) : undefined; } catch { body = text; }

  if (!res.ok) {
    const payload = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
    const baseMessage = typeof payload.message === "string" ? payload.message : `API error ${res.status}`;
    const fieldErrors = Array.isArray(payload.errors)
      ? payload.errors.reduce<Record<string, string>>((result, error) => {
          if (typeof error === "object" && error !== null) {
            const item = error as Record<string, unknown>;
            if (typeof item.path === "string" && typeof item.message === "string") result[item.path] = item.message;
          }
          return result;
        }, {})
      : {};
    const details = Object.values(fieldErrors);
    const message = details.length ? `${baseMessage}: ${details.join("; ")}` : baseMessage;
    if (res.status === 401) apiErrorHandlers.onUnauthorized?.();
    if (res.status === 403) apiErrorHandlers.onForbidden?.(message);
    throw new ApiRequestError(message, res.status, fieldErrors, typeof payload.code === "string" ? payload.code : undefined);
  }
  if (res.status === 204) return undefined as T;
  return body as T;
}