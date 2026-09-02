import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "https://api.goanny.in";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function proxyClientRequest(request: NextRequest, id: string) {
  try {
    const headers = new Headers();
    const authorization = request.headers.get("authorization");
    const cookie = request.headers.get("cookie");
    const contentType = request.headers.get("content-type");

    if (authorization) headers.set("authorization", authorization);
    if (cookie) headers.set("cookie", cookie);
    if (contentType) headers.set("content-type", contentType);

    const response = await fetch(`${BACKEND_URL}/api/clients/${encodeURIComponent(id)}`, {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.text(),
      cache: "no-store",
    });
    const body = await response.arrayBuffer();

    return new NextResponse(body.byteLength ? body : null, {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("[api/clients/:id proxy]", error);
    return NextResponse.json(
      { success: false, message: "Unable to reach the clients API" },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  return proxyClientRequest(request, (await params).id);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  return proxyClientRequest(request, (await params).id);
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  return proxyClientRequest(request, (await params).id);
}
