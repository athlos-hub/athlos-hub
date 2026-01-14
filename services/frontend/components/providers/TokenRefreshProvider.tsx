"use client";

import { useTokenRefresh } from "@/hooks/useTokenRefresh";

export function TokenRefreshProvider({ children }: { children: React.ReactNode }) {
    useTokenRefresh(5, 60);

    return <>{children}</>;
}
