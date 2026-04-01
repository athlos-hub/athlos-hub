import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Criar conta",
  description:
    "Cadastre-se no AthlosHub e participe de competições esportivas, clubes e comunidade.",
};

export default function CadastroLayout({ children }: { children: React.ReactNode }) {
  return children;
}
