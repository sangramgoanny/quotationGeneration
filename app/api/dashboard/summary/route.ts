import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "https://api.goanny.in";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!from || !to || !ISO_DATE.test(from) || !ISO_DATE.test(to) || from > to) {
    return NextResponse.json({ success: false, message: "A valid from/to date range is required" }, { status: 400 });
  }
  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");
  if (authorization) headers.set("authorization", authorization);
  if (cookie) headers.set("cookie", cookie);
  if (!authorization && !cookie) return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 });
  try {
    const query = new URLSearchParams({ from, to });
    const response = await fetch(`${BACKEND_URL}/api/dashboard/summary?${query}`, { headers, cache: "no-store" });
    const body = await response.arrayBuffer();
    return new NextResponse(body.byteLength ? body : null, { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
  } catch (error) {
    console.error("[api/dashboard/summary proxy]", error);
    return NextResponse.json({ success: false, message: "Unable to reach the dashboard summary API" }, { status: 502 });
  }
}
