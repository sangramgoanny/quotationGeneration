const TOKEN_KEY = "admin_token";

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  // Cookie so middleware can read it server-side
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function authHeader(): Record<string, string> {
  const token = getToken();
  // Guard against stale "undefined" / "null" strings saved by old buggy code
  if (!token || token === "undefined" || token === "null") return {};
  return { Authorization: `Bearer ${token}` };
}

export function getUser(): { id: string; email: string; name?: string } | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const id = payload.sub ?? payload.id;
    if (!id) return null;
    return { id, email: payload.email, name: payload.user_metadata?.name };
  } catch {
    return null;
  }
}
