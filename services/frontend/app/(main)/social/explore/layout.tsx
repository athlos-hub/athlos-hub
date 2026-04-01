import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explorar",
  description: "Explore publicações e perfis da comunidade AthlosHub.",
};

export default function SocialExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
