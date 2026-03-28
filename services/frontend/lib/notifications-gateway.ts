/** Base URL do gateway para rotas de notificações (cliente e SSE). */
export function getNotificationsGatewayBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:8100/api'
  );
}
