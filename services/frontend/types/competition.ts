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
  id: number;
  name: string;
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
  id: number;
  name: string;
  modality_id: number;
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
  sport_ruleset_id?: number;
  sport_ruleset?: SportRuleset;
  current_phase?: CompetitionPhase;
}

export interface CompetitionCreate {
  name: string;
  modality_id: number;
  start_date: string;
  end_date: string;
  system: CompetitionSystem;
  min_members_per_team: number;
  max_members_per_team: number;
  image?: string;
  teams_qualified_per_group?: number;
  teams_per_group?: number;
  ruleset?: SportRulesetCreate;
  sport_ruleset_id?: number;
}

export interface CompetitionUpdate {
  name?: string;
  start_date?: string;
  end_date?: string;
  status?: CompetitionStatus;
  min_members_per_team?: number;
  max_members_per_team?: number;
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
  id: number;
  competition_id: number;
  name: string;
  abbreviation: string;
  description?: string;
  icon?: string;
  display_order: number;
}

export interface CompetitionStatCreate {
  name: string;
  abbreviation: string;
  description?: string;
  icon?: string;
  display_order?: number;
}

export interface Player {
  id: string;
  user_id: string;
  team_id: string;
}

export interface TeamWithPlayers {
  id: string;
  name: string;
  abbreviation: string;
  players: Player[];
}
