"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

interface ProvidersProps {
    children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    return (
        <SessionProvider>
            {children}
            <Toaster />
        </SessionProvider>
    );
}
