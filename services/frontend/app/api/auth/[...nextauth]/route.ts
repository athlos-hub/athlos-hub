import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

/** Buffer / JWT na sessão — garantir Node (evita falha opaca no cliente → CLIENT_FETCH_ERROR). */
export const runtime = "nodejs";