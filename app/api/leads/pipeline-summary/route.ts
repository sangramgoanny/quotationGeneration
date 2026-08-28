import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export async function GET(request: NextRequest) {
  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");
  if (authorization) headers.set("authorization", authorization);
  if (cookie) headers.set("cookie", cookie);
  try {
    const response = await fetch(`${BACKEND_URL}/api/leads/pipeline-summary`, { headers, cache: "no-store" });
    const body = await response.arrayBuffer();
    return new NextResponse(body.byteLength ? body : null, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    console.error("[api/leads/pipeline-summary proxy]", error);
    return NextResponse.json({ success: false, message: "Unable to reach the pipeline summary API" }, { status: 502 });
  }
}
