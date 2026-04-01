import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Painel de clubes",
  description:
    "Gerencie e explore clubes e equipes: competições ativas, organizações e convites no AthlosHub.",
};

export default function ClubesPainelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
