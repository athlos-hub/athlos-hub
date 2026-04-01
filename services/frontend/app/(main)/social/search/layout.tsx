import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buscar",
  description: "Busque atletas, clubes e conteúdo na rede AthlosHub.",
};

export default function SocialSearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
