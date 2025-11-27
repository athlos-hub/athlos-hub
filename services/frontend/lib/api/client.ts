"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import axios, { AxiosError, AxiosRequestConfig } from "axios";

import { APIProps, APIResponse } from "./types";
import { APIException } from "./errors";
import { parseErrorMessage, isAPIErrorData, getBaseURL } from "./utils";

export async function axiosAPI<TypeResponse = unknown>({
                                                           endpoint,
                                                           method = "GET",
                                                           data,
                                                           queryParams,
                                                           withAuth = true,
                                                           withAttachment = false,
                                                           bearerToken,
                                                       }: APIProps): Promise<APIResponse<TypeResponse>> {
    try {
        const config: AxiosRequestConfig = {
            baseURL: getBaseURL(),
            method,
            url: endpoint,
            params: queryParams,
            timeout: 30000,
        };

        if (method !== "GET" && data) {
            config.data = data;
        }

        if (withAttachment && data instanceof FormData) {
            config.headers = {
                "Content-Type": "multipart/form-data",
            };
        } else {
            config.headers = {
                "Content-Type": "application/json",
            };
        }

        if (withAuth) {
            if (bearerToken) {
                config.headers = {
                    ...config.headers,
                    Authorization: `Bearer ${bearerToken}`,
                };
            } else {
                const session = await getServerSession(authOptions);

                if (!session?.accessToken) {
                    throw new APIException(
                        "Usuário não autenticado",
                        401,
                        "UNAUTHORIZED"
                    );
                }

                config.headers = {
                    ...config.headers,
                    Authorization: `Bearer ${session.accessToken}`,
                };
            }
        }

        const response = await axios<TypeResponse>(config);

        return {
            data: response.data,
            status: response.status,
            headers: response.headers as Record<string, string>,
        };

    } catch (error) {
        const axiosError = error as AxiosError<unknown>;

        if (!axiosError.response) {
            throw new APIException(
                axiosError.message || "Erro de conexão com o servidor",
                0,
                "NETWORK_ERROR"
            );
        }

        const errorData = axiosError.response.data;
        const status = axiosError.response.status;
        const message = parseErrorMessage(errorData);

        let code: string | undefined;
        if (isAPIErrorData(errorData)) {
            code = errorData.code;
        }

        throw new APIException(message, status, code);
    }
}