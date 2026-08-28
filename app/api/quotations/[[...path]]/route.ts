import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

interface RouteContext {
  params: Promise<{ path?: string[] }>;
}

async function proxyQuotationRequest(request: NextRequest, path: string[]) {
  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");
  const contentType = request.headers.get("content-type");
  if (authorization) headers.set("authorization", authorization);
  if (cookie) headers.set("cookie", cookie);
  if (contentType) headers.set("content-type", contentType);

  const suffix = path.map((segment) => encodeURIComponent(segment)).join("/");
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
  const init: RequestInit = { method: request.method, headers, body, cache: "no-store" };
  let response = await fetch(`${BACKEND_URL}/api/quotations${suffix ? `/${suffix}` : ""}${request.nextUrl.search}`, init);
  if (response.status === 404) {
    response = await fetch(`${BACKEND_URL}/api/quotes${suffix ? `/${suffix}` : ""}${request.nextUrl.search}`, init);
  }
  const responseBody = await response.arrayBuffer();

  return new NextResponse(responseBody.byteLength ? responseBody : null, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
}

async function handle(request: NextRequest, context: RouteContext) {
  try {
    return await proxyQuotationRequest(request, (await context.params).path ?? []);
  } catch (error) {
    console.error("[api/quotations proxy]", error);
    return NextResponse.json(
      { success: false, message: "Unable to reach the quotations API" },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) { return handle(request, context); }
export async function POST(request: NextRequest, context: RouteContext) { return handle(request, context); }
export async function PATCH(request: NextRequest, context: RouteContext) { return handle(request, context); }
export async function DELETE(request: NextRequest, context: RouteContext) { return handle(request, context); }
