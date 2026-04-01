"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { TokenRefreshProvider } from "@/components/providers/TokenRefreshProvider";
import { NotificationsRealtimeClient } from "@/components/providers/NotificationsRealtimeClient";

interface ProvidersProps {
    children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    return (
        <SessionProvider>
            <TokenRefreshProvider>
                <NotificationsRealtimeClient />
                {children}
            </TokenRefreshProvider>
            <Toaster />
        </SessionProvider>
    );
}
