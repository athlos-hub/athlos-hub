import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FinalCtaSectionProps {
  isAuthenticated: boolean;
}

export function FinalCtaSection({ isAuthenticated }: FinalCtaSectionProps) {
  return (
    <section
      className="relative left-1/2 w-[100vw] min-w-0 -translate-x-1/2 overflow-hidden bg-main py-20 pb-24 text-primary-foreground sm:pb-28 md:min-h-[min(48vh,520px)] md:pb-32"
      aria-labelledby="home-final-cta-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden
      >
        <div className="absolute -right-20 -top-20 size-80 rounded-full bg-white blur-3xl" />
        <div className="absolute -bottom-24 -left-16 size-72 rounded-full bg-white/50 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-0 w-full max-w-7xl flex-col justify-center px-6 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="home-final-cta-heading"
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
          >
            Sua próxima competição começa aqui.
          </h2>
          <p className="mt-4 text-base text-white/85 sm:text-lg">
            Cadastre-se em minutos, convide equipes e coloque o calendário no
            ar — sem planilhas soltas e sem atrito para a torcida.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            {isAuthenticated ? (
              <Link
                href="/organizations"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-white text-main hover:bg-white/90"
                )}
              >
                Criar competição
              </Link>
            ) : (
              <Link
                href="/auth/cadastro"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-white text-main hover:bg-white/90"
                )}
              >
                Criar conta grátis
              </Link>
            )}
            <a
              href="mailto:contato@athloshub.com"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              )}
            >
              Falar com a equipe
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
