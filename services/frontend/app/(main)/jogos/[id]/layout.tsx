import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transmissão",
  description: "Assista à transmissão ao vivo e ao placar desta partida no AthlosHub.",
};

export default function JogoLiveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
