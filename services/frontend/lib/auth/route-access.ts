/**
 * Regras de acesso por rota (espelhadas no middleware).
 * Rotas não listadas em requiresAuthPath são públicas (podem ter recursos opcionais com login).
 */

/** Caminhos que exigem sessão (match exato ou prefixo). */
const AUTH_REQUIRED_EXACT = new Set<string>([
  "/profile",
  "/organizations/invites",
  "/clubes/painel",
  "/clubes/novo",
]);

const AUTH_REQUIRED_PREFIXES = [
  "/notifications", // /notifications e /notifications/[id]
];

/** Padrão: entrada via link mágico (precisa de sessão para concluir no backend). */
const ORG_JOIN_LINK = /^\/organizations\/[^/]+\/join-link\/?$/;

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function requiresAuthPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);

  if (AUTH_REQUIRED_EXACT.has(normalized)) return true;

  for (const prefix of AUTH_REQUIRED_PREFIXES) {
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      return true;
    }
  }

  if (ORG_JOIN_LINK.test(normalized)) return true;

  return false;
}
