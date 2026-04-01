"use client";

import { useNotifications } from "@/hooks/use-notifications";

interface NotificationsProviderProps {
  children: React.ReactNode;
}

/**
 * Inicializa e mantém o estado global de notificações (SSE + cache no store)
 * para evitar múltiplos hooks carregando os mesmos dados em paralelo.
 */
export function NotificationsProvider({ children }: NotificationsProviderProps) {
  useNotifications(true, false, 30000, true, true);
  return <>{children}</>;
}

