import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { refreshAccessToken } from "@/lib/token-utils";

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.refreshToken) {
            return NextResponse.json(
                { error: "Sem refresh token na sessão" },
                { status: 401 }
            );
        }

        const newTokens = await refreshAccessToken(session.refreshToken);

        if (!newTokens) {
            return NextResponse.json(
                { error: "Falha ao renovar token" },
                { status: 401 }
            );
        }

        return NextResponse.json({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
            success: true,
        });
    } catch (error) {
        console.error("❌ [REFRESH-API] Erro ao renovar token:", error);
        return NextResponse.json(
            { error: "Erro ao renovar token" },
            { status: 500 }
        );
    }
}
