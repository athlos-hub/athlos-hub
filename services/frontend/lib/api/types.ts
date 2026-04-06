export type ServiceType = "auth" | "auth_upstream" | "competitions";

export interface APIProps {
    endpoint: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    /** FormData (multipart), objeto JSON ou array JSON (ex.: POST /users/batch com lista de ids). */
    data?: Record<string, unknown> | FormData | unknown[];
    queryParams?: Record<string, string | number | boolean>;
    withAuth?: boolean;
    withAttachment?: boolean;
    bearerToken?: string;
    service?: ServiceType;
    /** Cancela a requisição (ex.: timeout manual via AbortController). */
    signal?: AbortSignal;
}

export interface APIResponse<T> {
    data: T;
    status: number;
    headers?: Record<string, string>;
}

export interface APIErrorData {
    detail?: string;
    message?: string;
    error?: string;
    errors?: string[] | ValidationError[];
    code?: string;
}

export interface ValidationError {
    msg: string;
    loc?: string[];
    type?: string;
}

export interface APIConfig {
    baseURL: string;
    timeout?: number;
}