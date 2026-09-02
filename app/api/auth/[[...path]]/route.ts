import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "https://api.goanny.in";

interface RouteContext {
  params: Promise<{ path?: string[] }>;
}

async function proxyAuthRequest(request: NextRequest, path: string[]) {
  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");
  const contentType = request.headers.get("content-type");
  if (authorization) headers.set("authorization", authorization);
  if (cookie) headers.set("cookie", cookie);
  if (contentType) headers.set("content-type", contentType);

  const suffix = path.map((segment) => encodeURIComponent(segment)).join("/");
  const requestBody = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
  const response = await fetch(
    `${BACKEND_URL}/api/auth${suffix ? `/${suffix}` : ""}${request.nextUrl.search}`,
    { method: request.method, headers, body: requestBody, cache: "no-store" },
  );
  const responseBody = await response.arrayBuffer();
  const responseHeaders: Record<string, string> = {
    "content-type": response.headers.get("content-type") ?? "application/json",
  };
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) responseHeaders["set-cookie"] = setCookie;

  return new NextResponse(responseBody.byteLength ? responseBody : null, {
    status: response.status,
    headers: responseHeaders,
  });
}

async function handle(request: NextRequest, context: RouteContext) {
  try {
    return await proxyAuthRequest(request, (await context.params).path ?? []);
  } catch (error) {
    console.error("[api/auth proxy]", error);
    return NextResponse.json(
      { success: false, message: "Unable to reach the authentication API" },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) { return handle(request, context); }
export async function POST(request: NextRequest, context: RouteContext) { return handle(request, context); }
