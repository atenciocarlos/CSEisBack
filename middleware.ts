import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Middleware — Route Protection
 *
 * Protects /dashboard/* and /api/* routes (except /api/auth/*).
 * Unauthenticated requests to dashboard routes are redirected to login,
 * and unauthenticated API requests receive a 401 JSON response.
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow auth-related routes (login, register, NextAuth internals)
    if (pathname.startsWith("/api/auth")) {
        return NextResponse.next();
    }

    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    // Protected API routes — return 401 JSON
    if (pathname.startsWith("/api/") && !token) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    // Protected dashboard routes — redirect to login
    if (pathname.startsWith("/dashboard") && !token) {
        const loginUrl = new URL("/", request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/api/:path*"],
};
