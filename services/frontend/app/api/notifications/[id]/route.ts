import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import axios from 'axios';

const NOTIFICATIONS_API_URL = process.env.NEXT_PUBLIC_NOTIFICATIONS_API_URL || 'http://localhost:8003/api/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;

    const response = await axios.get(
      `${NOTIFICATIONS_API_URL}/notifications/${id}`,
      {
        headers: {
          'x-user-id': session.user.id,
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar notificação' },
      { status: error.response?.status || 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;

    await axios.delete(
      `${NOTIFICATIONS_API_URL}/notifications/${id}`,
      {
        headers: {
          'x-user-id': session.user.id,
        },
      }
    );

    return new Response(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar notificação' },
      { status: error.response?.status || 500 }
    );
  }
}
