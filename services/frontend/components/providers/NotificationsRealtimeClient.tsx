"use client";

import { useNotifications } from "@/hooks/use-notifications";

/**
 * Cliente global de notificações em tempo real.
 * Mantém SSE + carga inicial ativos para qualquer rota autenticada.
 */
export function NotificationsRealtimeClient() {
  useNotifications(true, false, 30000, true, true);
  return null;
}

