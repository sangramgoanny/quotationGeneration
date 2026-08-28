import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

interface RouteContext {
  params: Promise<{ id: string; path: string[] }>;
}

async function proxyNestedClientRequest(request: NextRequest, id: string, path: string[]) {
  try {
    const headers = new Headers();
    const authorization = request.headers.get("authorization");
    const cookie = request.headers.get("cookie");
    const contentType = request.headers.get("content-type");

    if (authorization) headers.set("authorization", authorization);
    if (cookie) headers.set("cookie", cookie);
    if (contentType) headers.set("content-type", contentType);

    const nestedPath = path.map((segment) => encodeURIComponent(segment)).join("/");
    const requestBody = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
    const init: RequestInit = { method: request.method, headers, body: requestBody, cache: "no-store" };
    let response = await fetch(
      `${BACKEND_URL}/api/clients/${encodeURIComponent(id)}/${nestedPath}${request.nextUrl.search}`,
      init,
    );
    if (response.status === 404 && path[0] === "quotations") {
      response = await fetch(
        `${BACKEND_URL}/api/clients/${encodeURIComponent(id)}/quotes${path.length > 1 ? `/${path.slice(1).map((segment) => encodeURIComponent(segment)).join("/")}` : ""}${request.nextUrl.search}`,
        init,
      );
    }
    const responseBody = await response.arrayBuffer();

    return new NextResponse(responseBody.byteLength ? responseBody : null, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("[api/clients/:id/* proxy]", error);
    return NextResponse.json(
      { success: false, message: "Unable to reach the clients API" },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id, path } = await params;
  return proxyNestedClientRequest(request, id, path);
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id, path } = await params;
  return proxyNestedClientRequest(request, id, path);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id, path } = await params;
  return proxyNestedClientRequest(request, id, path);
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id, path } = await params;
  return proxyNestedClientRequest(request, id, path);
}
