import { parseBackendIsoToDate } from "./parse-backend-iso";

/**
 * Converte o valor de `<input type="datetime-local">` (hora local do usuário)
 * em ISO 8601 UTC, sem depender de `Date.parse` em string sem fuso (comportamento inconsistente).
 */
export function datetimeLocalInputToUtcIsoString(localValue: string): string {
  const trimmed = localValue.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(trimmed);
  if (!m) {
    throw new RangeError(`Data e hora inválidas: ${localValue}`);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const sec = m[6] !== undefined ? Number(m[6]) : 0;
  const dt = new Date(y, mo - 1, d, h, mi, sec, 0);
  if (Number.isNaN(dt.getTime())) {
    throw new RangeError("Data e hora inválidas.");
  }
  return dt.toISOString();
}

/**
 * Exibe no `datetime-local` a mesma convenção de {@link parseBackendIsoToDate}
 * (strings sem offset do backend tratadas como UTC).
 */
export function backendIsoToDatetimeLocalInput(iso?: string | null): string {
  if (!iso || typeof iso !== "string") return "";
  const trimmed = iso.trim();
  if (!trimmed) return "";
  try {
    const date = parseBackendIsoToDate(trimmed);
    if (Number.isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${y}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}
