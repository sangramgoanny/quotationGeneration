import { authHeader } from "@/utils/token";
import { API_BASE_URL as BASE } from "@/lib/api/config";

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
    const errorList = Array.isArray(b?.errors)
      ? (b.errors as unknown[])
          .map((er) => (typeof er === "string" ? er : (er as Record<string, unknown>)?.message))
          .filter((m): m is string => typeof m === "string" && m.length > 0)
      : [];
    const message = errorList.length ? `${baseMessage}: ${errorList.join("; ")}` : baseMessage;
    console.error(`[API] ${method} ${url} → ${res.status}:`, body);
    throw new Error(message);
  }

  console.log(`[API] ${method} ${url} → ${res.status}:`, body);

  if (res.status === 204) return undefined as T;
  return body as T;
}
