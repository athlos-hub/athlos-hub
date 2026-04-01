import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conectando",
  description: "Concluindo autenticação no AthlosHub.",
  robots: { index: false, follow: false },
};

export default function AuthCallbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
