import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/sessions";

const PUBLIC_PATHS = [
  "/admin/login",
  "/admin/register",
  "/api/auth/login",
  "/api/auth/register",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only handle /admin and /api/admin routes
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  // Allow public auth paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Validate session
  const token = request.cookies.get("session_token")?.value ?? "";
  const session = token ? await getSession(token) : null;

  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Pass userId to downstream handlers via header
  const headers = new Headers(request.headers);
  headers.set("x-user-id", session.userId);
  headers.set("x-username", session.username);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
