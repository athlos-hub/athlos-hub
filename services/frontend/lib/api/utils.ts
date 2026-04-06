import { APIErrorData, ValidationError } from "./types";

export function isValidationError(error: unknown): error is ValidationError {
    return (
        typeof error === "object" &&
        error !== null &&
        "msg" in error
    );
}

export function isAPIErrorData(data: unknown): data is APIErrorData {
    return (
        typeof data === "object" &&
        data !== null &&
        (
            "detail" in data ||
            "message" in data ||
            "error" in data ||
            "errors" in data ||
            "code" in data
        )
    );
}

export function parseErrorMessage(errorData: unknown): string {
    if (!errorData) {
        return "Ocorreu um erro inesperado";
    }

    if (typeof errorData === "string") {
        return errorData;
    }

    if (!isAPIErrorData(errorData)) {
        return "Ocorreu um erro inesperado";
    }

    if (typeof errorData.detail === "string") {
        return errorData.detail;
    }

    if (typeof errorData.message === "string") {
        return errorData.message;
    }

    if (typeof errorData.error === "string") {
        return errorData.error;
    }

    if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        if (isValidationError(errorData.errors[0])) {
            return errorData.errors
                .filter(isValidationError)
                .map((err) => {
                    const field = err.loc?.join(".") || "campo";
                    return `${field}: ${err.msg}`;
                })
                .join(", ");
        }

        if (typeof errorData.errors[0] === "string") {
            return errorData.errors.join(", ");
        }
    }

    return JSON.stringify(errorData);
}

export function getBaseURL(): string {
    const base = process.env.API_BASE_URL || "http://localhost:8100/api";
    return base.replace(/\/$/, "");
}

export function getServiceURL(service: "auth" | "auth_upstream" | "competitions" = "auth"): string {
    const gateway = (process.env.API_BASE_URL || "http://localhost:8100/api").replace(/\/$/, "");
    const gatewayNoApi = gateway.replace(/\/api$/, "");

    if (service === "competitions") {
        return (process.env.COMPETITIONS_API_URL || gateway).replace(/\/$/, "");
    }

    if (service === "auth") {
        return gateway;
    }

    const authHost = (process.env.AUTH_API_URL || "").replace(/\/$/, "");
    const authHostNoApi = authHost.replace(/\/api$/, "");

    // Evita loop pelo gateway quando AUTH_API_URL aponta para o mesmo host do API_BASE_URL.
    if (authHostNoApi && authHostNoApi !== gatewayNoApi) {
        return `${authHostNoApi}/api`;
    }

    // Upstream direto para casos específicos (ex.: register multipart).
    return "http://localhost:8000/api";
}

export function buildQueryString(params?: Record<string, string | number | boolean>): string {
    if (!params) return "";

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : "";
}