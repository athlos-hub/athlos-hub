import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { notificationsUpstreamAuth, getNotificationsGatewayUrl } from '@/lib/server/notifications-upstream';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await notificationsUpstreamAuth();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await params;

    const response = await axios.get(`${getNotificationsGatewayUrl()}/notifications/${id}`, {
      headers: auth.headers,
    });

    return NextResponse.json(response.data);
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { status?: number } };
    return NextResponse.json(
      { error: err.message || 'Erro ao buscar notificação' },
      { status: err.response?.status || 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await notificationsUpstreamAuth();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = await params;

    await axios.delete(`${getNotificationsGatewayUrl()}/notifications/${id}`, {
      headers: auth.headers,
    });

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { status?: number } };
    return NextResponse.json(
      { error: err.message || 'Erro ao deletar notificação' },
      { status: err.response?.status || 500 }
    );
  }
}
