import type { TeamDetail } from "@/types/team";

/**
 * Verifica se o usuário é capitão do time
 */
export function isCaptain(team: TeamDetail): boolean {
  return team.members?.some(m => m.is_captain && m.user.keycloak_id === team.captain_id) ?? false;
}

/**
 * Verifica se o time pode ser aprovado (tem membros suficientes)
 */
export function canApprove(team: TeamDetail): boolean {
  const memberCount = team.members?.length ?? 0;
  return memberCount >= team.min_members;
}
