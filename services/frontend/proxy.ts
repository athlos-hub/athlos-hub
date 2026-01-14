import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function extractRolesFromToken(accessToken: string): string[] {
    try {
        const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
        return payload?.realm_access?.roles || [];
    } catch {
        return [];
    }
}

export async function proxy(req: NextRequest) {
    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET
    });

    const { pathname, searchParams } = req.nextUrl;

    if (pathname.startsWith("/reset-password")) {
        return NextResponse.next();
    }

    if (token) {
        const roles = token.accessToken ? extractRolesFromToken(token.accessToken as string) : [];
        const isAdmin = roles.includes('admin');

        if (pathname.startsWith("/auth") || pathname === "/verify") {
            const redirectUrl = isAdmin ? "/admin" : "/";
            return NextResponse.redirect(new URL(redirectUrl, req.url));
        }

        if (pathname.startsWith("/admin")) {
            if (!isAdmin) {
                return NextResponse.redirect(new URL("/", req.url));
            }
            return NextResponse.next();
        }

        if (isAdmin) {
            return NextResponse.redirect(new URL("/admin", req.url));
        }
    } else {
        if (pathname.startsWith("/admin")) {
            return NextResponse.redirect(new URL("/auth/login", req.url));
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