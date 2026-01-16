import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import axios from 'axios';

const NOTIFICATIONS_API_URL = process.env.NEXT_PUBLIC_NOTIFICATIONS_API_URL || 'http://localhost:8003/api/v1';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const response = await axios.get(`${NOTIFICATIONS_API_URL}/notifications/unread-count`, {
      params: {
        user_id: session.user.id,
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Erro ao contar notificações:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao contar notificações' },
      { status: error.response?.status || 500 }
    );
  }
}
