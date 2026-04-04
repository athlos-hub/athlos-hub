import { NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 12 * 1024 * 1024;

/** Hostnames permitidos para evitar SSRF; alinhar com next.config images.remotePatterns + env. */
function isAllowedImageHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  const extra =
    process.env.AVATAR_PROXY_EXTRA_HOSTS?.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [];
  if (extra.includes(h)) return true;
  if (h === "lh3.googleusercontent.com") return true;
  if (h === "athloshub-media.s3.us-east-2.amazonaws.com") return true;
  if (h.startsWith("athloshub-media.s3.") && h.endsWith(".amazonaws.com")) return true;
  return false;
}

/**
 * Busca imagem no servidor (sem restrição CORS do browser) para o fluxo de crop do avatar.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Parâmetro url é obrigatório" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ error: "Protocolo não permitido" }, { status: 400 });
  }

  if (!isAllowedImageHost(target.hostname)) {
    return NextResponse.json({ error: "Host não permitido" }, { status: 403 });
  }

  const upstream = await fetch(target.toString(), {
    redirect: "follow",
    headers: { Accept: "image/*,*/*" },
    next: { revalidate: 0 },
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Falha ao buscar imagem (${upstream.status})` },
      { status: 502 }
    );
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  if (!contentType.startsWith("image/") && contentType !== "application/octet-stream") {
    return NextResponse.json({ error: "Resposta não é imagem" }, { status: 502 });
  }

  const buf = await upstream.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "Imagem muito grande" }, { status: 413 });
  }

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType.startsWith("image/") ? contentType : "image/jpeg",
      "Cache-Control": "private, max-age=60",
    },
  });
}
