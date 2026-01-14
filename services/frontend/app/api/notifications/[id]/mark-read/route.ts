import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import axios from 'axios';

const NOTIFICATIONS_API_URL = process.env.NEXT_PUBLIC_NOTIFICATIONS_API_URL || 'http://localhost:8003/api/v1';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;

    const response = await axios.post(
      `${NOTIFICATIONS_API_URL}/notifications/${id}/mark-read`,
      {},
      {
        headers: {
          'x-user-id': session.user.id,
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Erro ao marcar notificação como lida:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao marcar notificação' },
      { status: error.response?.status || 500 }
    );
  }
}
