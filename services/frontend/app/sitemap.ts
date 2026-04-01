import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * URLs públicas principais. Em produção, estenda com rotas dinâmicas (competições, orgs) via API se necessário.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = absoluteUrl("");
  const now = new Date();

  const routes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: absoluteUrl("/competitions"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: absoluteUrl("/organizations"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/jogos"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/social"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/social/explore"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/social/search"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/clubes/painel"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
  ];

  return routes;
}
