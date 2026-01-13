"use server";

import { cookies } from "next/headers";
import { axiosAPI } from "@/lib/api/client";
import { APIException } from "@/lib/api/errors";

interface RegisterResponse {
    message: string;
    id: string;
    avatar_url?: string;
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
        const avatarFile = formData.get("avatar");

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

        const backendFormData = new FormData();
        backendFormData.append("email", email);
        backendFormData.append("username", username);
        backendFormData.append("password", password);
        backendFormData.append("first_name", first_name);
        backendFormData.append("last_name", last_name || "");

        if (avatarFile && avatarFile instanceof File && avatarFile.size > 0) {
            backendFormData.append("avatar", avatarFile);
        }

        await axiosAPI<RegisterResponse>({
            endpoint: "/auth/register",
            method: "POST",
            data: backendFormData,
            withAuth: false,
            withAttachment: true
        });

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
        const resp = await axiosAPI<{ message?: string }>({
            endpoint: `/auth/verify/${token}`,
            method: "POST",
            data: {},
            withAuth: false
        });

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
        const resp = await axiosAPI<{ message?: string }>({
            endpoint: `/auth/resend-verification`,
            method: "POST",
            data: { email },
            withAuth: false
        });

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

interface UserProfileResponse {
    id: string;
    username: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    enabled: boolean;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
}

interface UpdateUserResponse {
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url?: string | null;
}

export async function getUserProfile(): Promise<UserProfileResponse> {
    try {
        const response = await axiosAPI<UserProfileResponse>({
            endpoint: "/users/me",
            method: "GET",
            withAuth: true,
        });

        const data = response.data as any;

        const normalized: UserProfileResponse = {
            id: data.id,
            username: data.username ?? data.preferred_username ?? null,
            email: data.email ?? null,
            first_name: (data.first_name ?? data.firstName ?? data.given_name) ?? null,
            last_name: (data.last_name ?? data.lastName ?? data.family_name) ?? null,
            avatar_url: (data.avatar_url ?? data.avatarUrl ?? data.picture) ?? null,
            enabled: data.enabled ?? false,
            email_verified: data.email_verified ?? data.emailVerified ?? false,
            created_at: data.created_at ?? data.createdTimestamp ?? data.createdAt ?? null,
            updated_at: data.updated_at ?? data.updatedAt ?? null,
        };

        return normalized;

    } catch (error) {
        if (error instanceof APIException) {
            throw error;
        }
        throw error;
    }
}

export async function updateUserProfile(formData: FormData): Promise<UpdateUserResponse> {
    try {
        const firstNameRaw = formData.get("first_name");
        const lastNameRaw = formData.get("last_name");
        const usernameRaw = formData.get("username");
        const avatarFile = formData.get("avatar");

        const backendFormData = new FormData();

        if (firstNameRaw) {
            const firstName = typeof firstNameRaw === "string" ? firstNameRaw : firstNameRaw?.toString() ?? "";
            if (firstName.trim()) {
                backendFormData.append("first_name", firstName);
            }
        }

        if (lastNameRaw) {
            const lastName = typeof lastNameRaw === "string" ? lastNameRaw : lastNameRaw?.toString() ?? "";
            if (lastName.trim()) {
                backendFormData.append("last_name", lastName);
            }
        }

        if (usernameRaw) {
            const username = typeof usernameRaw === "string" ? usernameRaw : usernameRaw?.toString() ?? "";
            if (username.trim()) {
                backendFormData.append("username", username);
            }
        }

        if (avatarFile && avatarFile instanceof File && avatarFile.size > 0) {
            backendFormData.append("avatar", avatarFile);
        }

        const response = await axiosAPI<UpdateUserResponse>({
            endpoint: "/users/me",
            method: "PUT",
            data: backendFormData,
            withAuth: true,
            withAttachment: true
        });

        return response.data;

    } catch (error) {
        if (error instanceof APIException) {
            throw error;
        }
        throw error;
    }
}
