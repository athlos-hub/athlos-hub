/**
 * Converte string ISO do backend em `Date` de forma estável no browser.
 * Valores sem fuso (comum com datetime UTC naive no servidor) são tratados como UTC;
 * caso contrário `new Date` assume hora local e o "há X minutos" fica errado.
 */
export function parseBackendIsoToDate(iso: string): Date {
  const normalized = iso.trim().replace(" ", "T");
  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized);
  const withZone = hasTimezone ? normalized : `${normalized}Z`;
  return new Date(withZone);
}
