"use server";

import { axiosAPI } from "./client";
import { APIResponse } from "./types";

export async function apiGet<T = unknown>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
    withAuth = true
): Promise<APIResponse<T>> {
    return axiosAPI<T>({
        endpoint,
        method: "GET",
        queryParams: params,
        withAuth,
    });
}

export async function apiPost<T = unknown>(
    endpoint: string,
    data?: Record<string, unknown>,
    withAuth = true
): Promise<APIResponse<T>> {
    return axiosAPI<T>({
        endpoint,
        method: "POST",
        data,
        withAuth,
    });
}

export async function apiPut<T = unknown>(
    endpoint: string,
    data?: Record<string, unknown>,
    withAuth = true
): Promise<APIResponse<T>> {
    return axiosAPI<T>({
        endpoint,
        method: "PUT",
        data,
        withAuth,
    });
}

export async function apiPatch<T = unknown>(
    endpoint: string,
    data?: Record<string, unknown>,
    withAuth = true
): Promise<APIResponse<T>> {
    return axiosAPI<T>({
        endpoint,
        method: "PATCH",
        data,
        withAuth,
    });
}

export async function apiDelete<T = unknown>(
    endpoint: string,
    withAuth = true
): Promise<APIResponse<T>> {
    return axiosAPI<T>({
        endpoint,
        method: "DELETE",
        withAuth,
    });
}


export async function apiUpload<T = unknown>(
    endpoint: string,
    formData: FormData,
    withAuth = true
): Promise<APIResponse<T>> {
    return axiosAPI<T>({
        endpoint,
        method: "POST",
        data: formData,
        withAttachment: true,
        withAuth,
    });
}