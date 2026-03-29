"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * O layout principal não usa mais py-32 em todo o shell: isso criava faixa branca
 * entre o header fixo e o hero da home e padding inferior após o último bloco.
 * Na rota "/" o padding é zero; nas demais, mantém-se espaço abaixo do header e rodapé.
 */
export function MainContentPadding({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/" || pathname === "";

  return (
    <div
      className={cn(
        "min-w-0 w-full",
        isHome
          ? "pt-0 pb-0"
          : "pt-32 pb-32"
      )}
    >
      {children}
    </div>
  );
}
