import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "https://api.goanny.in";
interface RouteContext { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const headers = new Headers({ "content-type": "application/json" });
  const authorization = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");
  if (authorization) headers.set("authorization", authorization);
  if (cookie) headers.set("cookie", cookie);
  try {
    const { id } = await context.params;
    const response = await fetch(`${BACKEND_URL}/api/leads/${encodeURIComponent(id)}/qualification`, {
      method: "PATCH",
      headers,
      body: await request.text(),
      cache: "no-store",
    });
    const body = await response.arrayBuffer();
    return new NextResponse(body.byteLength ? body : null, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    console.error("[api/leads/:id/qualification proxy]", error);
    return NextResponse.json({ success: false, message: "Unable to reach the lead qualification API" }, { status: 502 });
  }
}
