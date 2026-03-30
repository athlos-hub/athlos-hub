"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoginCtaBannerProps {
  /** Texto curto explicando o que o login desbloqueia nesta página */
  description: string;
  /** Opcional: rota para voltar após login (default: página atual) */
  callbackPath?: string;
  className?: string;
}

/**
 * Faixa discreta para páginas públicas cujo conteúdo principal é visível a todos,
 * mas algumas ações exigem sessão (ex.: calendário, seguir feed).
 */
export function LoginCtaBanner({
  description,
  callbackPath,
  className,
}: LoginCtaBannerProps) {
  const pathname = usePathname();
  const cb = encodeURIComponent(callbackPath ?? pathname);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-main/20 bg-main/5 px-4 py-3 text-sm text-main ${className ?? ""}`}
    >
      <p className="text-gray-700">{description}</p>
      <Link href={`/auth/login?callbackUrl=${cb}`}>
        <Button
          size="sm"
          variant="outline"
          type="button"
          className="shrink-0 border-main text-main hover:bg-main/10"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Entrar
        </Button>
      </Link>
    </div>
  );
}
