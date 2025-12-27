import { NextResponse } from 'next/server';
import { apiPost, APIException } from '@/lib/api';

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    if (!token) {
        return NextResponse.json({ success: false, error: 'Token ausente.' }, { status: 400 });
    }
    try {
        const body = await request.json();
        const { new_password } = body;
        await apiPost(`/auth/reset-password/${token}`, { new_password }, false);
        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof APIException) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }
        const message = error instanceof Error ? error.message : String(error ?? 'Erro ao redefinir senha');
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
