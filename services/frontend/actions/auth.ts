"use server";

import { apiPost, APIException } from "@/lib/api";
import { cookies } from "next/headers";

interface RegisterResponse {
    message: string;
    user_id: string;
}

interface ActionResponse {
    success: boolean;
    error?: string;
    message?: string;
}

export async function registerUser(formData: FormData): Promise<void> {
    try {
        const emailRaw = formData.get("email");
        const passwordRaw = formData.get("password");
        const firstRaw = formData.get("first_name") ?? formData.get("name");
        const lastRaw = formData.get("last_name");
        const usernameRaw = formData.get("username");

        const email = typeof emailRaw === "string" ? emailRaw : emailRaw?.toString() ?? "";
        const password = typeof passwordRaw === "string" ? passwordRaw : passwordRaw?.toString() ?? "";
        let first_name = typeof firstRaw === "string" ? firstRaw : firstRaw?.toString() ?? "";
        const last_name = typeof lastRaw === "string" ? lastRaw : lastRaw?.toString() ?? "";

        if (!formData.get("first_name") && formData.get("name")) {
            const parts = first_name.trim().split(/\s+/);
            if (parts.length > 1) {
                first_name = parts.shift() || "";
            }
        }

        let username = typeof usernameRaw === "string" ? usernameRaw : usernameRaw?.toString() ?? "";
        if (!username) {
            if (email) {
                username = email.split("@")[0];
            } else {
                username = (first_name + (last_name || "")).toLowerCase() || "user";
            }
        }

        const payload = {
            email,
            username,
            password,
            first_name,
            last_name: last_name || null,
            avatar_url: null,
        };

        await apiPost<RegisterResponse>("/auth/register", payload, false);

        const emailVal = email || null;
        if (emailVal) {
            const cookieStore = await cookies();
            cookieStore.set("pending_verification_email", emailVal, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 60 * 60 * 24,
                path: "/",
                sameSite: "lax",
            });
        }

        return;

    } catch (error) {
        if (error instanceof APIException) {
            throw error;
        }

        throw error;
    }
}

export async function verifyEmail(token: string): Promise<ActionResponse> {
    if (!token) {
        return { success: false, error: "Token não fornecido." };
    }

    try {
        const resp = await apiPost<{ message?: string }>(`/auth/verify/${token}`, {}, false);

        return {
            success: true,
            message: resp.data?.message || "Email verificado com sucesso!",
        };

    } catch (error) {
        if (error instanceof APIException) {
            return { success: false, error: error.message };
        }

        return {
            success: false,
            error: "Falha na comunicação com o servidor. Tente novamente."
        };
    }
}

export async function resendVerificationEmail(email: string): Promise<ActionResponse> {
    try {
        const resp = await apiPost<{ message?: string }>(`/auth/resend-verification`, { email }, false);

        return { success: true, message: resp.data?.message };
    } catch (error) {
        if (error instanceof APIException) {
            return { success: false, error: error.message };
        }

        return {
            success: false,
            error: "Erro de conexão ao reenviar email"
        };
    }
}