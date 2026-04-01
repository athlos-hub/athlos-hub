import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar",
  description:
    "Acesse sua conta AthlosHub para acompanhar competições, clubes, notificações e o feed da comunidade.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
