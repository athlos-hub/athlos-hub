"use server";

import { axiosAPI } from "@/lib/api/client";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

type UploadResponse = { url: string };

/**
 * Envia uma imagem para o auth-service (S3, prefixo social-posts) e devolve a URL pública.
 * Mesmo fluxo de validação que avatar/logo (tipos e 5MB).
 */
export async function uploadSocialPostImage(formData: FormData): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    throw new Error("Usuário não autenticado");
  }

  const file = formData.get("image");
  if (!file || !(file instanceof File)) {
    throw new Error("Nenhuma imagem selecionada");
  }

  const upstream = new FormData();
  upstream.append("image", file);

  const response = await axiosAPI<UploadResponse>({
    endpoint: "/users/me/social-post-image",
    method: "POST",
    data: upstream,
    withAuth: true,
    bearerToken: session.accessToken,
    withAttachment: true,
  });

  if (!response.data?.url) {
    throw new Error("Resposta de upload inválida");
  }

  return response.data.url;
}
