import { NextResponse } from 'next/server';
import { apiPost, APIException } from '@/lib/api';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;
        if (!email) return NextResponse.json({ success: false, error: 'Email ausente' }, { status: 400 });

        try {
            const resp = await apiPost('/auth/resend-verification', { email }, false);
            const data = (resp as unknown) as { data?: { message?: string } };
            return NextResponse.json({ success: true, message: data?.data?.message ?? 'Email reenviado' });
        } catch (err) {
            if (err instanceof APIException) {
                return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
            }
            return NextResponse.json({ success: false, error: 'Reenvio não suportado pelo servidor. Contate o suporte.' }, { status: 501 });
        }

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error ?? 'Erro');
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
