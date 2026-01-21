import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import axios from 'axios';

const API_GATEWAY_URL = process.env.API_BASE_URL || 'http://localhost:8100/api/v1';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('page_size') || '50';
    const unreadOnly = searchParams.get('unread_only') === 'true';

    const response = await axios.get(`${API_GATEWAY_URL}/notifications`, {
      params: {
        user_id: session.user.id,
        page,
        page_size: pageSize,
        unread_only: unreadOnly,
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Erro ao buscar notificações:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar notificações' },
      { status: error.response?.status || 500 }
    );
  }
}
