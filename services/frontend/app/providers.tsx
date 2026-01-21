"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { TokenRefreshProvider } from "@/components/providers/TokenRefreshProvider";

interface ProvidersProps {
    children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    return (
        <SessionProvider>
            <TokenRefreshProvider>
                {children}
            </TokenRefreshProvider>
            <Toaster />
        </SessionProvider>
    );
}
