import { NextResponse } from 'next/server';
import { apiPost, APIException } from '@/lib/api';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        await apiPost('/auth/register', body, false);

        const res = NextResponse.json({ success: true });

        if (email) {
            res.cookies.set('pending_verification_email', String(email), {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24,
                path: '/',
                sameSite: 'lax',
            });
        }

        return res;

    } catch (error) {
        if (error instanceof APIException) {
            return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        }

        const message = error instanceof Error ? error.message : String(error ?? 'Erro ao criar usuário');
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
