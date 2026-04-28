import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";

const ACCESS_SKIP_PATHS = ["/access", "/api/access", "/_next", "/favicon.ico"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // アクセスコードチェック（公開パス・静的ファイルはスキップ）
  if (
    !ACCESS_SKIP_PATHS.some((p) => pathname.startsWith(p)) &&
    !pathname.includes(".")
  ) {
    const verified = request.cookies.get("access_verified");
    if (!verified || verified.value !== "1") {
      const url = request.nextUrl.clone();
      url.pathname = "/access";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  // セッションチェック（/protected/ 配下のみ）
  if (pathname.startsWith("/protected/")) {
    const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionId) {
      const loginUrl = new URL("/login", request.url);
      const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      loginUrl.searchParams.set("next", next);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
