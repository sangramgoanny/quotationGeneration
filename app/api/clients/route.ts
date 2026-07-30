import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

async function proxyClientsRequest(request: NextRequest) {
  try {
    const headers = new Headers();
    const authorization = request.headers.get("authorization");
    const cookie = request.headers.get("cookie");
    const contentType = request.headers.get("content-type");

    if (authorization) headers.set("authorization", authorization);
    if (cookie) headers.set("cookie", cookie);
    if (contentType) headers.set("content-type", contentType);

    const response = await fetch(`${BACKEND_URL}/api/clients${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body: request.method === "GET" ? undefined : await request.text(),
      cache: "no-store",
    });

    const payload: unknown = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("[api/clients proxy]", error);
    return NextResponse.json(
      { success: false, message: "Unable to reach the clients API" },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest) {
  return proxyClientsRequest(request);
}

export async function POST(request: NextRequest) {
  return proxyClientsRequest(request);
}
