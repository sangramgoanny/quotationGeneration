import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "https://api.goanny.in";

interface RouteContext { params: Promise<{ id: string }> }

async function proxy(request: NextRequest, id: string) {
  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");
  const contentType = request.headers.get("content-type");
  if (authorization) headers.set("authorization", authorization);
  if (cookie) headers.set("cookie", cookie);
  if (contentType) headers.set("content-type", contentType);

  try {
    const response = await fetch(`${BACKEND_URL}/api/leads/${encodeURIComponent(id)}`, {
      method: request.method,
      headers,
      body: request.method === "GET" ? undefined : await request.text(),
      cache: "no-store",
    });
    const body = await response.arrayBuffer();
    return new NextResponse(body.byteLength ? body : null, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    console.error("[api/leads/:id proxy]", error);
    return NextResponse.json({ success: false, message: "Unable to reach the leads API" }, { status: 502 });
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).id);
}
