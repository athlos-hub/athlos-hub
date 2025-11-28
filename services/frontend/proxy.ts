import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET
    });

    const { pathname, searchParams } = req.nextUrl;

    if (token) {
        if (pathname.startsWith("/auth") || pathname === "/verify") {
            return NextResponse.redirect(new URL("/", req.url));
        }
    }

    if (pathname === "/verify") {
        const hasTokenInUrl = searchParams.has("token");
        const hasPendingCookie = req.cookies.has("pending_verification_email");

        if (!hasTokenInUrl && !hasPendingCookie) {
            return NextResponse.redirect(new URL("/auth/login", req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};