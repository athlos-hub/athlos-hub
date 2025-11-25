import type { Metadata } from "next";
import "./styles/globals.css";
import { Outfit, Bebas_Neue } from "next/font/google";
import PlayerHeader from "@/components/layout/player/header";

const outfit = Outfit({
    variable: "--font-outfit",
    weight: [
        "100","200","300","400","500","600","700","800","900"
    ],
    subsets: ["latin"],
    display: "swap",
});

const bebasNeue = Bebas_Neue({
    variable: "--font-bebas-neue",
    weight: ["400"],
    subsets: ["latin"],
    display: "swap",
});

export const metadata: Metadata = {
    title: "AthlosHub - Plataforma de Gestão de Competições Esportivas",
    description: "Plataforma multi-organizacional que transforma a gestão de torneios em uma experiência simples e transparente. Acompanhe jogos ao vivo, estatísticas em tempo real e conecte-se com a comunidade esportiva.",
    icons: {
        icon: [
            { url: '/favicons/favicon.ico' },
            { url: '/favicons/genfavicon-16.png', sizes: '16x16', type: 'image/png' },
            { url: '/favicons/genfavicon-32.png', sizes: '32x32', type: 'image/png' },
            { url: '/favicons/genfavicon-180.png', sizes: '180x180', type: 'image/png' },
            { url: '/favicons/genfavicon-512.png', sizes: '512x512', type: 'image/png' },
        ],
        apple: [
            { url: '/favicons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
    },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
          className={`${outfit.variable} ${bebasNeue.variable} antialiased`}
      >
        <PlayerHeader />
        <main className="min-h-screen px-[5rem]">
          {children}
        </main>
      </body>
    </html>
  );
}
