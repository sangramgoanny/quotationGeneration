import type { ChatBootstrap } from "@/lib/api/chat-token";

// Keys deliberately match goanny-chat/frontend/src/lib/auth/token-store.ts so
// that when the chat iframe runs on the same origin (via reverse proxy) it
// reads the token directly from localStorage — no postMessage needed.
const CHAT_TOKEN_KEY = "goanny.chat.token";
const CHAT_USER_KEY = "goanny.chat.user";
const CHAT_EXPIRY_KEY = "goanny.chat.expiresAt";

export function storeChatBootstrap(b: ChatBootstrap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHAT_TOKEN_KEY, b.accessToken);
  localStorage.setItem(CHAT_USER_KEY, JSON.stringify(b.user));
  localStorage.setItem(CHAT_EXPIRY_KEY, String(Date.now() + b.expiresIn * 1000));
}

export function clearChatBootstrap() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CHAT_TOKEN_KEY);
  localStorage.removeItem(CHAT_USER_KEY);
  localStorage.removeItem(CHAT_EXPIRY_KEY);
}

export function getChatToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CHAT_TOKEN_KEY);
}

export function getChatUser(): ChatBootstrap["user"] | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CHAT_USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as ChatBootstrap["user"]; } catch { return null; }
}

// Refresh if we have < marginMs left before the chat JWT expires.
export function chatTokenExpiringSoon(marginMs = 60_000): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(CHAT_EXPIRY_KEY);
  if (!raw) return true;
  const expiresAt = Number(raw);
  if (!Number.isFinite(expiresAt)) return true;
  return expiresAt - Date.now() < marginMs;
}
