import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import axios from 'axios';

const API_GATEWAY_URL = process.env.API_BASE_URL || 'http://localhost:8100/api/v1';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = `${API_GATEWAY_URL}/notifications/clear-all`;

    const response = await axios.delete(
      url,
      {
        headers: {
          'x-user-id': session.user.id,
        },
      }
    );

    return new Response(JSON.stringify(response.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        error: error.response?.data?.detail || error.response?.data || 'Erro ao limpar notificações',
        status: error.response?.status,
        details: error.response?.data
      }),
      {
        status: error.response?.status || 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
