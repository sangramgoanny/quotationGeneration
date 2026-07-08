import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "admin_token";
const PUBLIC_PATHS = ["/login", "/admin/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /**
   * CORS FOR API ROUTES
   */
  if (pathname.startsWith("/api")) {
    const origin = req.headers.get("origin") || "*";
    
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods":
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    const response = NextResponse.next();

    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  /**
   * AUTH MIDDLEWARE
   */
  const isAuthenticated = !!req.cookies.get(COOKIE_NAME)?.value;

  // Root path redirect
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(isAuthenticated ? "/dashboard" : "/login", req.url)
    );
  }

  // Logged-in user trying to access login
  if (isAuthenticated && PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Allow public routes
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Not logged in
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.webp).*)",
  ],
};