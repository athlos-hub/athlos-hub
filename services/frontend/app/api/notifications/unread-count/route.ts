import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import axios from 'axios';

const API_GATEWAY_URL = process.env.API_BASE_URL || 'http://localhost:8100/api/v1';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const response = await axios.get(`${API_GATEWAY_URL}/notifications/unread-count`, {
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
