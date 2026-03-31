export enum TeamStatus {
  PENDING = "PENDING",
  RECRUITING = "RECRUITING",
  READY = "READY",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  // Legacy status do competitions-service
  ACTIVE = "ACTIVE",
}

export enum InviteStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
}

export enum TeamRole {
  CAPTAIN = "CAPTAIN",
  PLAYER = "PLAYER",
}

// Estrutura do usuário retornada pelo auth-service
export interface TeamMemberUser {
  id: string;
  keycloak_id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

// Membro do time com usuário aninhado
export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  is_captain: boolean;
  joined_at: string;
  user: TeamMemberUser;
}

// Legacy Player interface para compatibilidade
export interface Player {
  id: string;
  team_id: string;
  keycloak_id: string;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  invite_token: string;
  invite_url: string;
  created_by?: string;
  status: InviteStatus | string;
  expires_at: string;
  max_uses: number | null;
  use_count: number;
  created_at: string;
}

export interface TeamBase {
  id: string;
  name: string;
  abbreviation: string;
  status: TeamStatus | string;
  organization_slug: string;
  organization_id?: string;
  competition_name: string;
  captain_id?: string | null;
  created_at: string;
  updated_at?: string;
}

// Item da lista de times do usuário
export interface TeamListItem {
  id: string;
  organization_slug: string;
  organization_name?: string;
  /** ID da competição (formato do auth/competitions; comparar com String()) */
  competition_id: number | string;
  competition_name: string;
  name: string;
  abbreviation: string;
  status: TeamStatus;
  player_count: number;
  role: TeamRole;
  created_at: string;
}

// Resposta básica do time (sem membros)
export interface TeamResponse {
  id: string;
  organization_id: string;
  organization_slug: string;
  organization_name?: string;
  competition_id: string;
  competition_name: string;
  name: string;
  abbreviation: string;
  status: TeamStatus;
  min_members: number;
  max_members: number;
  member_count: number;
  captain_id: string;
  created_at: string;
  updated_at: string;
}

// Detalhes completos do time (com membros)
export interface TeamDetail extends TeamResponse {
  members: TeamMember[];
  external_team_id?: string | null;
}

export interface TeamWithRole extends TeamDetail {
  role: TeamRole;
}

export interface CreateInviteRequest {
  expires_in_days?: number;
  max_uses?: number | null;
}

export interface InviteValidationResponse {
  valid: boolean;
  team_id?: string;
  team_name?: string;
  organization_name?: string;
  competition_name?: string;
  message?: string;
  error?: string;
}

export interface AcceptInviteResponse {
  success: boolean;
  team_id: string;
  team_name: string;
  message: string;
  added_to_organization?: boolean;
}

// Request para criar time (com competition_id da competição selecionada)
export interface TeamCreateRequest {
  organization_slug: string;
  competition_id: string;
  competition_name: string;
  name: string;
  abbreviation: string;
  min_members?: number;
  max_members?: number;
  captain_keycloak_id: string;
  players: { keycloak_id: string }[];
}

export interface TeamCreateResponse extends TeamResponse {}

export interface TeamApprovalResponse {
  success: boolean;
  team_id: string;
  external_team_id: string;
  message: string;
}
