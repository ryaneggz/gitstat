import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Set x-demo-mode header when ?demo=true so server components can detect it
  if (request.nextUrl.searchParams.get("demo") === "true") {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-demo-mode", "true");
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
