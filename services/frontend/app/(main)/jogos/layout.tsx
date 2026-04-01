import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jogos ao vivo",
  description:
    "Assista transmissões ao vivo, acompanhe placar e partidas em tempo real no AthlosHub.",
};

export default function JogosSectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
