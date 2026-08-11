import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const BASE_PATH = "/survey";
const PUBLIC_PATHS = ["/admin/login", "/api/admin/login"];

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET 环境变量未设置");
  return new TextEncoder().encode(secret);
}

/** 去掉 basePath 获取相对路径 */
function stripBasePath(pathname: string): string {
  if (BASE_PATH && pathname.startsWith(BASE_PATH)) {
    return pathname.slice(BASE_PATH.length) || "/";
  }
  return pathname;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const relativePath = stripBasePath(pathname);

  // 只处理 /admin 和 /api/admin 路由
  if (!relativePath.startsWith("/admin") && !relativePath.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  // 允许公开路径
  if (PUBLIC_PATHS.some((p) => relativePath.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;
  if (!token) {
    if (relativePath.startsWith("/api/")) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }
    const loginUrl = new URL(`${BASE_PATH}/admin/login`, request.url);
    loginUrl.searchParams.set("redirect", relativePath);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      !payload ||
      typeof payload.userId !== "string" ||
      typeof payload.role !== "string"
    ) {
      throw new Error("invalid payload");
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.userId);
    requestHeaders.set("x-user-role", payload.role);
    requestHeaders.set("x-user-name", (payload.username as string) ?? "");

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    if (relativePath.startsWith("/api/")) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }
    const loginUrl = new URL(`${BASE_PATH}/admin/login`, request.url);
    loginUrl.searchParams.set("redirect", relativePath);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
