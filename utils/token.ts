const TOKEN_KEY = "admin_token";
// Mirror of goanny-chat's token-store keys — signing out of the ERP must
// invalidate the child chat session so the iframe re-authenticates on next open.
const CHAT_TOKEN_KEY = "goanny.chat.token";
const CHAT_USER_KEY = "goanny.chat.user";
const CHAT_EXPIRY_KEY = "goanny.chat.expiresAt";

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  // Cookie so middleware can read it server-side
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  // The backend reads its canonical cookie name when requests are proxied.
  document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = `auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  localStorage.removeItem(CHAT_TOKEN_KEY);
  localStorage.removeItem(CHAT_USER_KEY);
  localStorage.removeItem(CHAT_EXPIRY_KEY);
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

export function getUser(): { id: string; email: string; name?: string; role?: string } | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const id = payload.sub ?? payload.id;
    if (!id) return null;
    return {
      id,
      email: payload.email,
      name: payload.user_metadata?.name,
      role: payload.role ?? payload.user_metadata?.role,
    };
  } catch {
    return null;
  }
}
