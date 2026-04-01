import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Redefina sua senha de acesso ao AthlosHub.",
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
