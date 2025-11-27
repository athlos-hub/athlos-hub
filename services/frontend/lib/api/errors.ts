export class APIException extends Error {
    status?: number;
    code?: string;

    constructor(message: string, status?: number, code?: string) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = "APIException";

        Object.setPrototypeOf(this, APIException.prototype);
    }

    isAuthError(): boolean {
        return this.status === 401 || this.code === "UNAUTHORIZED";
    }

    isForbiddenError(): boolean {
        return this.status === 403 || this.code === "FORBIDDEN";
    }

    isValidationError(): boolean {
        return this.status === 422 || this.code === "VALIDATION_ERROR";
    }

    isNetworkError(): boolean {
        return this.status === 0 || this.code === "NETWORK_ERROR";
    }

    isServerError(): boolean {
        return this.status !== undefined && this.status >= 500;
    }
}