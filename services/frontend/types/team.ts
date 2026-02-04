export enum TeamStatus {
  ACTIVE = "ACTIVE",
  PENDING = "PENDING",
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
  created_by: string;
  status: InviteStatus;
  expires_at: string;
  max_uses: number | null;
  use_count: number;
  created_at: string;
}

export interface TeamBase {
  id: string;
  name: string;
  abbreviation: string;
  status: TeamStatus;
  organization_slug: string;
  competition_id: number;
  team_captain: string | null;
  created_at: string;
}

export interface TeamListItem extends TeamBase {
  competition_name?: string;
  organization_name?: string;
  player_count?: number;
  role: TeamRole;
}

export interface TeamDetail extends TeamBase {
  players: Player[];
  competition_name: string;
  organization_name?: string;
  modality_name?: string;
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
  organization_slug?: string;
  competition_id?: number;
  competition_name?: string;
  expires_at?: string;
  remaining_uses?: number | null;
  error?: string;
}

export interface AcceptInviteResponse {
  message: string;
  team_id: string;
  team_name: string;
  player_id: string;
  competition_id: number;
}
