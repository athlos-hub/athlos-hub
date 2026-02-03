"use server";

import { axiosAPI } from "@/lib/api";
import type { Modality, ModalityCreate } from "@/types/modality";

export async function listModalities(
  offset = 0,
  limit = 100
): Promise<Modality[]> {
  const response = await axiosAPI<Modality[]>({
    endpoint: "/modalities",
    method: "GET",
    queryParams: { offset, limit },
    withAuth: true,
  });

  return response.data;
}

export async function createModality(
  data: ModalityCreate
): Promise<Modality> {
  const response = await axiosAPI<Modality>({
    endpoint: "/modalities",
    method: "POST",
    data,
    withAuth: true,
  });

  return response.data;
}
