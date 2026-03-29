import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const SOCIAL_SERVICE_URL = process.env.SOCIAL_SERVICE_URL || "http://localhost:8100";

async function handleRequest(req: NextRequest, method: string) {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
        return NextResponse.json(
            { error: "Não autenticado" },
            { status: 401 }
        );
    }

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const socialIndex = pathSegments.indexOf('social');
    const remainingPath = pathSegments.slice(socialIndex + 1).join('/');
    
    const targetUrl = `${SOCIAL_SERVICE_URL}/api/social/${remainingPath}${url.search}`;
    
    console.log(`[SOCIAL PROXY] ${method} ${url.pathname} -> ${targetUrl}`);

    try {
        const options: RequestInit = {
            method,
            headers: {
                "Authorization": `Bearer ${session.accessToken}`,
                "Content-Type": "application/json",
            },
        };

        if (method !== "GET" && method !== "DELETE") {
            const body = await req.text();
            if (body) {
                options.body = body;
            }
        }

        const response = await fetch(targetUrl, options);
        const data = await response.text();
        
        console.log(`[SOCIAL PROXY] Response status: ${response.status}`);
        
        return new NextResponse(data, {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        console.error("[SOCIAL PROXY] Erro:", error);
        return NextResponse.json(
            { error: "Erro ao comunicar com o serviço social" },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    return handleRequest(req, "GET");
}

export async function POST(req: NextRequest) {
    return handleRequest(req, "POST");
}

export async function PUT(req: NextRequest) {
    return handleRequest(req, "PUT");
}

export async function DELETE(req: NextRequest) {
    return handleRequest(req, "DELETE");
}
