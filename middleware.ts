import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static files, next internals and auth routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    // allow all API routes to be handled by the API (don't redirect to signin)
    pathname.startsWith("/api/") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/public") ||
    pathname.includes("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Check for a valid next-auth token (session)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    // Redirect to sign-in page and preserve the requested URL as callback
    const signInUrl = req.nextUrl.clone();
    signInUrl.pathname = "/api/auth/signin";
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware for all routes except _next and api/auth (handled above)
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
