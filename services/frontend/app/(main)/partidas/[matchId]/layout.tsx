import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partida",
  description:
    "Ficha da partida: placar, estatísticas e informações da competição no AthlosHub.",
};

export default function PartidaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
