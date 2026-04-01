export enum CompetitionStatus {
  PENDING = 'pending',
  STARTED = 'started',
  FINISHED = 'finished',
}

export enum CompetitionSystem {
  POINTS = 'points',
  ELIMINATION = 'elimination',
  MIXED = 'mixed',
}

export interface SportRuleset {
  id: string;
  name: string;
  organization_slug?: string | null;
  segment_type: string;
  segments_regular_number: number;
  overtime_segments: number;
  penalty_segments: number;
  has_break_segments: boolean;
}

export interface SportRulesetCreate {
  name: string;
  segment_type: string;
  segments_regular_number: number;
  overtime_segments: number;
  penalty_segments: number;
  has_break_segments: boolean;
}

export enum CompetitionPhase {
  GROUPS = 'groups',
  ELIMINATION = 'elimination',
}

export interface Competition {
  id: string;
  name: string;
  modality_id: string;
  organization_slug?: string;
  start_date: string;
  end_date: string;
  status: CompetitionStatus;
  system: CompetitionSystem;
  min_members_per_team: number;
  max_members_per_team: number;
  image?: string;
  teams_qualified_per_group?: number;
  teams_per_group?: number;
  sport_ruleset_id?: string;
  sport_ruleset?: SportRuleset;
  stats_ruleset?: {
    id: string;
    name: string;
    description?: string;
    stats_types: CompetitionStat[];
  } | null;
  current_phase?: CompetitionPhase;
}

export interface CompetitionCreate {
  name: string;
  modality_id: string;
  start_date: string;
  end_date: string;
  system: CompetitionSystem;
  min_members_per_team: number;
  max_members_per_team: number;
  image?: string;
  teams_qualified_per_group?: number;
  teams_per_group?: number;
  ruleset?: SportRulesetCreate;
  sport_ruleset_id?: string;
  stats_ruleset?: {
    name: string;
    description?: string;
    stats_types: any[];
  };
  stats_ruleset_id?: string;
}

export interface CompetitionUpdate {
  name?: string;
  start_date?: string;
  end_date?: string;
  status?: CompetitionStatus;
  min_members_per_team?: number;
  max_members_per_team?: number;
  system?: CompetitionSystem;
  sport_ruleset_id?: string;
  stats_ruleset_mode?: "keep" | "none" | "new";
}

export interface GenerateStructureRequest {
  organization_id: string;
}

export interface GenerateStructureResponse {
  message: string;
  system: string;
  matches_created: number;
  lives_created: number;
  lives: any[];
}

export interface CompetitionStat {
  id: string;
  competition_id: string;
  name: string;
  abbreviation: string;
  description?: string;
  display_order: number;
}

export interface CompetitionStatCreate {
  name: string;
  abbreviation: string;
  description?: string;
  display_order?: number;
}

export interface Player {
  id: string;
  keycloak_id: string;
  team_id: string;
}

export interface TeamWithPlayers {
  id: string;
  name: string;
  abbreviation: string;
  logo_url?: string | null;
  /** ID do time no auth-service; preferir em links para /clubes/[id] */
  auth_team_id?: string | null;
  players: Player[];
}
