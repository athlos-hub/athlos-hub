import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requiresAuthPath } from "@/lib/auth/route-access";

function getRolesFromAccessToken(accessToken: string): string[] {
  try {
    const base64 = accessToken.split(".")[1];
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as {
      realm_access?: { roles?: string[] };
    };
    return payload?.realm_access?.roles || [];
  } catch {
    return [];
  }
}

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
        ? getRolesFromAccessToken(token.accessToken as string)
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
      ? getRolesFromAccessToken(token.accessToken as string)
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

    // Comportamento legado: usuários com papel admin só utilizam o painel /admin
    if (isAdmin) {
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
