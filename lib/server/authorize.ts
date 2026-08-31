import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export type AuthorizeResult = { ok: true; uploadedBy: string } | { ok: false; status: number };

function extractDisplayName(authorization: string | null): string {
  if (!authorization) return "Current User";
  try {
    const token = authorization.replace(/^Bearer\s+/i, "");
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64").toString("utf8"));
    return payload.name || payload.email || payload.user_metadata?.name || "Current User";
  } catch {
    return "Current User";
  }
}

// Delegates authorization to the existing backend: if it lets the caller read this
// client/lead, the caller may manage its documents (avoids re-implementing auth here).
export async function authorizeEntityAccess(
  request: NextRequest,
  kind: "clients" | "leads",
  id: string
): Promise<AuthorizeResult> {
  const authorization = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");
  if (!authorization && !cookie) return { ok: false, status: 401 };

  const headers = new Headers();
  if (authorization) headers.set("authorization", authorization);
  if (cookie) headers.set("cookie", cookie);

  try {
    const res = await fetch(`${BACKEND_URL}/api/${kind}/${encodeURIComponent(id)}`, { headers, cache: "no-store" });
    if (!res.ok) return { ok: false, status: res.status === 404 ? 404 : res.status === 403 ? 403 : 401 };
  } catch {
    return { ok: false, status: 502 };
  }

  return { ok: true, uploadedBy: extractDisplayName(authorization) };
}
