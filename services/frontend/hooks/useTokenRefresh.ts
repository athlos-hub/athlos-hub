"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef } from "react";
import { getTokenExpiryTime } from "@/lib/token-utils";

export function useTokenRefresh(minutesBeforeExpiry: number = 5, checkIntervalSeconds: number = 60) {
    const { data: session, update } = useSession();
    const refreshingRef = useRef(false);

    useEffect(() => {
        if (!session?.accessToken || !session?.refreshToken) {
            return;
        }

        const checkAndRefresh = async () => {
            if (refreshingRef.current) {
                return;
            }

            if (!session?.accessToken) {
                return;
            }

            const timeRemaining = getTokenExpiryTime(session.accessToken);
            const thresholdSeconds = minutesBeforeExpiry * 60;

            if (timeRemaining <= 0) {
                console.warn("⚠️ Token expirado. Fazendo logout...");
                await signOut({ 
                    callbackUrl: "/auth/login",
                    redirect: true 
                });
                return;
            }

            if (timeRemaining <= thresholdSeconds) {
                refreshingRef.current = true;

                try {
                    const response = await fetch("/api/auth/refresh-token", {
                        method: "POST",
                    });

                    if (response.ok) {
                        const data = await response.json();
                        
                        await update({
                            accessToken: data.access_token,
                            refreshToken: data.refresh_token,
                        });

                        console.log("✅ Token renovado automaticamente");
                    } else {
                        console.error("❌ Falha ao renovar token. Fazendo logout...");
                        await signOut({ 
                            callbackUrl: "/auth/login",
                            redirect: true 
                        });
                    }
                } catch (error) {
                    console.error("❌ Erro ao renovar token:", error);
                    await signOut({ 
                        callbackUrl: "/auth/login",
                        redirect: true 
                    });
                } finally {
                    refreshingRef.current = false;
                }
            }
        };

        checkAndRefresh();

        const interval = setInterval(checkAndRefresh, checkIntervalSeconds * 1000);

        return () => clearInterval(interval);
    }, [session, minutesBeforeExpiry, checkIntervalSeconds, update]);

    return {
        isRefreshing: refreshingRef.current,
    };
}
