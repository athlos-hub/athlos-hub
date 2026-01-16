import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import axios from 'axios';

const NOTIFICATIONS_API_URL = process.env.NEXT_PUBLIC_NOTIFICATIONS_API_URL || 'http://localhost:8003/api/v1';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const response = await axios.post(
      `${NOTIFICATIONS_API_URL}/notifications/mark-all-read`,
      {},
      {
        headers: {
          'x-user-id': session.user.id,
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Erro ao marcar notificações como lidas:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao marcar notificações' },
      { status: error.response?.status || 500 }
    );
  }
}
