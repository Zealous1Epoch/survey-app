import { NextRequest, NextResponse } from "next/server";

/** 需要认证的路由前缀 */
const PROTECTED_PREFIXES = ["/admin", "/api/admin"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 检查是否是需要保护的路由
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  // 从 cookie 或 Authorization header 获取 token
  const token = req.cookies.get("admin_token")?.value
    ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  // 与环境变量中的 ADMIN_TOKEN 比对
  const adminToken = process.env.ADMIN_TOKEN;
  if (adminToken && token === adminToken) {
    return NextResponse.next();
  }

  // API 请求返回 401，页面请求重定向到 admin 首页（显示登录表单）
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};