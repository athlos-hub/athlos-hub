import type { Metadata } from "next";

export const SITE_NAME = "AthlosHub";

export const SITE_DESCRIPTION =
  "Plataforma multi-organizacional para competições esportivas: jogos ao vivo, placar em tempo real, estatísticas, clubes, organizações e comunidade.";

export const SITE_DESCRIPTION_SHORT =
  "Competições esportivas, ao vivo e em comunidade.";

export const SITE_KEYWORDS: string[] = [
  "esportes",
  "competições",
  "torneios",
  "campeonatos",
  "placar ao vivo",
  "estatísticas esportivas",
  "clubes",
  "organizações esportivas",
  "gestão de campeonatos",
  "AthlosHub",
];

/**
 * URL pública do site (OG, canonical, sitemap). Configure NEXT_PUBLIC_APP_URL em produção.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

function resolveOgImage(ogImage?: string | null): string {
  const fallback = absoluteUrl("/favicons/genfavicon-512.png");
  if (!ogImage?.trim()) return fallback;
  const u = ogImage.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/")) return absoluteUrl(u);
  return fallback;
}

/**
 * Metadata completa e padronizada para páginas internas (título usa template do root: `%s | AthlosHub`).
 */
export function buildPageMetadata(options: {
  title: string;
  description: string;
  path: string;
  ogImage?: string | null;
  ogType?: "website" | "article";
  noIndex?: boolean;
  keywords?: string[];
}): Metadata {
  const {
    title,
    description,
    path,
    ogImage,
    ogType = "website",
    noIndex = false,
    keywords,
  } = options;

  const url = absoluteUrl(path);
  const image = resolveOgImage(ogImage);
  const ogTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    keywords: keywords?.length ? keywords : undefined,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: "pt_BR",
      type: ogType,
      images: [
        {
          url: image,
          width: 512,
          height: 512,
          alt: `${SITE_NAME} — ${title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [image],
    },
  };
}

/** Metadata para áreas que não devem ser indexadas (auth, admin, fluxos privados). */
export function privateAreaMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  };
}
