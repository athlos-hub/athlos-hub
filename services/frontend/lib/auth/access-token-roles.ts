/**
 * Extrai realm_access.roles do access token (Keycloak).
 * Mesma decodificação em Edge (middleware) e Node (layouts): base64url + padding.
 */
export function getRealmRolesFromAccessToken(accessToken: string): string[] {
  try {
    const part = accessToken.split(".")[1];
    if (!part) return [];
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = (4 - (base64.length % 4)) % 4;
    const padded = base64 + "=".repeat(pad);
    const json = atob(padded);
    const payload = JSON.parse(json) as {
      realm_access?: { roles?: string[] };
    };
    return payload?.realm_access?.roles ?? [];
  } catch {
    return [];
  }
}
