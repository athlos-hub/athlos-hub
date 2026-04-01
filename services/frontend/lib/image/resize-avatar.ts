"use client";

const MAX_DIMENSION = 1024;
const TARGET_MAX_BYTES = 900 * 1024;
export const MAX_FINAL_AVATAR_BYTES = 1024 * 1024;
export const AVATAR_LIMIT_EXCEEDED_MESSAGE =
  "Imagem final ainda muito grande, escolha outra.";

export interface CropPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

function buildOutputName(originalName: string, mimeType: string): string {
  const base = originalName.replace(/\.[^/.]+$/, "");
  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  return `${base || "avatar"}.${ext}`;
}

function pickOutputType(inputType: string): "image/jpeg" | "image/webp" {
  if (inputType === "image/jpeg" || inputType === "image/jpg") {
    return "image/jpeg";
  }
  return "image/webp";
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const imgUrl = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Falha ao carregar imagem"));
      img.src = imgUrl;
    });
  } finally {
    URL.revokeObjectURL(imgUrl);
  }
}

async function drawImageToCanvas(
  file: File,
  cropAreaPixels?: CropPixels
): Promise<HTMLCanvasElement> {
  const image = await loadImageFromFile(file);

  const sourceX = Math.max(0, Math.round(cropAreaPixels?.x ?? 0));
  const sourceY = Math.max(0, Math.round(cropAreaPixels?.y ?? 0));
  const sourceWidth = Math.max(
    1,
    Math.round(cropAreaPixels?.width ?? image.width)
  );
  const sourceHeight = Math.max(
    1,
    Math.round(cropAreaPixels?.height ?? image.height)
  );

  const ratio = Math.min(MAX_DIMENSION / sourceWidth, MAX_DIMENSION / sourceHeight, 1);
  const width = Math.max(1, Math.round(sourceWidth * ratio));
  const height = Math.max(1, Math.round(sourceHeight * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas não suportado");
  }

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height
  );

  return canvas;
}

interface ResizeAvatarOptions {
  cropAreaPixels?: CropPixels;
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Falha ao processar imagem"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

export async function resizeAvatarImage(
  file: File,
  options: ResizeAvatarOptions = {}
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const canvas = await drawImageToCanvas(file, options.cropAreaPixels);
  const outputType = pickOutputType(file.type);

  let bestBlob = await canvasToBlob(canvas, outputType, 0.88);
  if (bestBlob.size > TARGET_MAX_BYTES) {
    const qualities = [0.8, 0.72, 0.64, 0.56];
    for (const quality of qualities) {
      const candidate = await canvasToBlob(canvas, outputType, quality);
      bestBlob = candidate;
      if (candidate.size <= TARGET_MAX_BYTES) break;
    }
  }

  // Mantém o arquivo original quando a otimização não gera ganho real.
  if (bestBlob.size >= file.size) {
    return file;
  }

  if (bestBlob.size > MAX_FINAL_AVATAR_BYTES) {
    throw new Error(AVATAR_LIMIT_EXCEEDED_MESSAGE);
  }

  return new File([bestBlob], buildOutputName(file.name, outputType), {
    type: outputType,
    lastModified: Date.now(),
  });
}
