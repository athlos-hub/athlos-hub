import { NextResponse } from 'next/server';
import { apiPost, APIException } from '@/lib/api';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;
        await apiPost('/auth/request-reset-password', { email }, false);
        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof APIException) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        const message = error instanceof Error ? error.message : String(error ?? 'Erro ao solicitar redefinição');
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
