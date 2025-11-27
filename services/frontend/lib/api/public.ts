import { APIResponse, APIErrorData } from "./types";
import { APIException } from "./errors";
import { parseErrorMessage, getBaseURL } from "./utils";

function clientBaseURL(): string {
    if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL) {
        return process.env.NEXT_PUBLIC_API_BASE_URL;
    }
    return getBaseURL();
}

async function handleResponse<T>(res: Response): Promise<APIResponse<T>> {
    const text = await res.text();

    let parsed: unknown = null;
    try {
        parsed = text ? JSON.parse(text) : null;
    } catch {
        parsed = text;
    }

    if (!res.ok) {
        const message = parseErrorMessage(parsed);
        const status = res.status;
        let code: string | undefined;

        if (typeof parsed === "object" && parsed !== null && (parsed as APIErrorData).code) {
            code = (parsed as APIErrorData).code;
        }

        throw new APIException(message, status, code);
    }

    return {
        data: parsed as T,
        status: res.status,
        headers: Object.fromEntries(res.headers.entries()),
    };
}

export async function publicGet<T = unknown>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<APIResponse<T>> {
    const query = params ? new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString() : "";
    const url = `${clientBaseURL()}${endpoint}${query ? `?${query}` : ""}`;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    return handleResponse<T>(res);
}

export async function publicPost<T = unknown>(endpoint: string, body?: Record<string, unknown> | FormData): Promise<APIResponse<T>> {
    const url = `${clientBaseURL()}${endpoint}`;
    const isForm = body instanceof FormData;

    const headers: Record<string, string> = {};
    if (!isForm) headers["Content-Type"] = "application/json";

    const res = await fetch(url, {
        method: "POST",
        headers,
        body: isForm ? (body as FormData) : JSON.stringify(body ?? {}),
    });

    return handleResponse<T>(res);
}

export async function publicUpload<T = unknown>(endpoint: string, formData: FormData): Promise<APIResponse<T>> {
    const url = `${clientBaseURL()}${endpoint}`;

    const res = await fetch(url, {
        method: "POST",
        body: formData,
    });

    return handleResponse<T>(res);
}
