import { request } from "@/lib/api/request";

export interface ChatBootstrap {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: {
    id: string;
    tenantId: string;
    externalUserId: string;
    displayName: string;
    email?: string | null;
    avatarUrl?: string | null;
    role?: string | null;
  };
}

interface ApiEnvelope<T> { success: boolean; data: T }

/**
 * Mint a fresh chat access token for the currently-authenticated ERP user.
 * Backend hits goanny-chat's /auth/exchange with a signed payload and returns
 * the resulting ChatTokenResponse verbatim. Requires ERP session (cookie or
 * Bearer) — passed through by request().
 */
export async function fetchChatToken(): Promise<ChatBootstrap> {
  const res = await request<ApiEnvelope<ChatBootstrap> | ChatBootstrap>(
    "/api/chat/token",
    { method: "POST" },
  );
  return (res as ApiEnvelope<ChatBootstrap>).data ?? (res as ChatBootstrap);
}
