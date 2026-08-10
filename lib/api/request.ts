import { authHeader } from "@/utils/token";
import { API_BASE_URL as BASE } from "@/lib/api/config";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE}${path}`;
  const method = options.method ?? "GET";

  // Log every outgoing request
  if (options.body) {
    console.log(`[API] ${method} ${url}`, JSON.parse(options.body as string));
  } else {
    console.log(`[API] ${method} ${url}`);
  }

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...(options.headers ?? {}),
    },
  });

  const text = await res.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = text; }

  if (!res.ok) {
    const b = body as Record<string, unknown>;
    const baseMessage = typeof b?.message === "string" ? b.message : `API error ${res.status}`;
    const fieldErrors = Array.isArray(b?.errors)
      ? (b.errors as unknown[]).reduce<Record<string, string>>((result, error) => {
          if (typeof error !== "object" || error === null) return result;
          const item = error as Record<string, unknown>;
          if (typeof item.path === "string" && typeof item.message === "string") {
            result[item.path] = item.message;
          }
          return result;
        }, {})
      : {};
    const errorList = Object.values(fieldErrors);
    const message = errorList.length ? `${baseMessage}: ${errorList.join("; ")}` : baseMessage;
    // The calling UI handles HTTP failures. Avoid triggering Next.js's dev
    // error overlay for a response that is already caught by the caller.
    console.warn(`[API] ${method} ${url} → ${res.status}:`, body);
    throw new ApiRequestError(message, res.status, fieldErrors);
  }

  console.log(`[API] ${method} ${url} → ${res.status}:`, body);

  if (res.status === 204) return undefined as T;
  return body as T;
}
