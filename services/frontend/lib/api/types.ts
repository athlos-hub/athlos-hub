export interface APIProps {
    endpoint: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    data?: Record<string, unknown> | FormData;
    queryParams?: Record<string, string | number | boolean>;
    withAuth?: boolean;
    withAttachment?: boolean;
    bearerToken?: string; // optional explicit bearer token to override server session token
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