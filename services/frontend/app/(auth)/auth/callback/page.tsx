"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

export default function AuthCallbackPage() {
    const router = useRouter();
    const processedRef = useRef(false);

    useEffect(() => {
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const code = params ? params.get("code") : null;

        if (code && !processedRef.current) {
            processedRef.current = true;

            const redirectUri = `${window.location.origin}/auth/callback`;

            signIn("credentials", {
                redirect: false,
                loginType: "keycloak",
                code: code,
                redirectUri: redirectUri,
            }).then((res) => {
                if (res?.error) {
                    toast.error('Falha ao autenticar com Google.');
                    router.push("/auth/login?error=GoogleLoginFailed");
                } else {
                    toast.success('Login efetuado com sucesso.');
                    router.push("/");
                    router.refresh();
                }
            });
        } else if (!code) {
            router.push("/auth/login");
        }
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-main border-r-main animate-spin"></div>
            </div>

            <div className="mt-8 text-center">
                <p className="text-lg font-semibold text-gray-800 animate-pulse">
                    Autenticando com Google
                </p>
                <p className="text-sm text-gray-600 mt-2">
                    Aguarde um momento...
                </p>
            </div>

            <div className="flex gap-2 mt-6">
                <div className="w-2 h-2 bg-main rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-main rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-main rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
        </div>
    );
}