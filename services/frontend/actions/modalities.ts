"use server";

import { axiosAPI } from "@/lib/api/client";
import type { Modality, ModalityCreate } from "@/types/modality";

export async function listModalities(
  offset = 0,
  limit = 100,
  organization_slug?: string
): Promise<Modality[]> {
  const queryParams: Record<string, number | string> = { offset, limit };
  if (organization_slug) {
    queryParams.organization_slug = organization_slug;
  }
  const response = await axiosAPI<Modality[]>({
    endpoint: "/modalities/",
    method: "GET",
    queryParams,
    withAuth: false,
    service: "competitions",
  });

  return response.data;
}

export async function createModality(
  data: ModalityCreate
): Promise<Modality> {
  const response = await axiosAPI<Modality>({
    endpoint: "/modalities/",
    method: "POST",
    data: data as unknown as Record<string, unknown>,
    withAuth: true,
    service: "competitions",
  });

  return response.data;
}
