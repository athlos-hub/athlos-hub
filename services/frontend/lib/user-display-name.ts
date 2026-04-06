/** Nome amigável a partir do perfil público do auth-service. */
export function formatUserProfileDisplayName(u: {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
}): string {
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  if (full) return full;
  const un = u.username?.trim();
  if (un) return un;
  return "Jogador";
}
