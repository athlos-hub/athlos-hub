import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getRealmRolesFromAccessToken } from "@/lib/auth/access-token-roles";
import { requiresAuthPath } from "@/lib/auth/route-access";

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (pathname.startsWith("/reset-password")) {
    return NextResponse.next();
  }

  // /verify: sem sessão precisa de token na URL ou cookie de e-mail pendente
  if (pathname === "/verify") {
    const hasTokenInUrl = searchParams.has("token");
    const hasPendingCookie = req.cookies.has("pending_verification_email");
    if (!token && !hasTokenInUrl && !hasPendingCookie) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
    if (token) {
      const roles = token.accessToken
        ? getRealmRolesFromAccessToken(token.accessToken as string)
        : [];
      const isAdmin = roles.includes("admin");
      return NextResponse.redirect(
        new URL(isAdmin ? "/admin" : "/", req.url)
      );
    }
    return NextResponse.next();
  }

  if (token) {
    const roles = token.accessToken
      ? getRealmRolesFromAccessToken(token.accessToken as string)
      : [];
    const isAdmin = roles.includes("admin");

    if (pathname.startsWith("/auth")) {
      if (pathname.startsWith("/auth/callback")) {
        return NextResponse.next();
      }
      const target = isAdmin ? "/admin" : "/";
      return NextResponse.redirect(new URL(target, req.url));
    }

    if (pathname.startsWith("/admin")) {
      if (!isAdmin) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    // Admin padrão → /admin, exceto /organizations/* (dono pode gerir org mesmo com role admin;
    // evita loop middleware ↔ layout quando o JWT decodifica diferente no servidor).
    if (isAdmin && !pathname.startsWith("/organizations")) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  } else {
    if (pathname.startsWith("/admin")) {
      const login = new URL("/auth/login", req.url);
      login.searchParams.set(
        "callbackUrl",
        `${pathname}${req.nextUrl.search}`
      );
      return NextResponse.redirect(login);
    }
  }

  if (requiresAuthPath(pathname) && !token) {
    const login = new URL("/auth/login", req.url);
    login.searchParams.set(
      "callbackUrl",
      `${pathname}${req.nextUrl.search}`
    );
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
