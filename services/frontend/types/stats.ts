// Stats Types - Estatísticas de jogadores/partidas

export interface StatsType {
  id: string;
  name: string;
  abbreviation: string;
  stats_ruleset_id: string;
}

export interface StatsRuleSet {
  id: string;
  name: string;
  description?: string;
  competition_id?: string;
  stats_types: StatsType[];
}

export interface PlayerBasicInfo {
  id: string;
  user_id: string;
  team_id: string;
  // Nome pode ser resolvido no frontend via user_id se necessário
  name?: string;
}

export interface TeamWithPlayers {
  id: string;
  name: string;
  abbreviation: string;
  logo_url?: string | null;
  auth_team_id?: string | null;
  players: PlayerBasicInfo[];
}

// Request para registrar pontuação/stat
export interface RegisterScoreRequest {
  team_side: "home" | "away";
  increment: number;
  segment_id?: string;
  stats_metric_abbreviation?: string;
  player_id?: string;
}

// Request para setar placar específico
export interface SetScoreRequest {
  home_score: number;
  away_score: number;
  segments?: {
    segment_id: string;
    home_score: number;
    away_score: number;
  }[];
  stats_events?: {
    player_id: string;
    abbreviation: string;
    value: number;
  }[];
}

// Response do match após update
export interface MatchScoreResponse {
  id: string;
  status: string;
  scheduled_datetime?: string;
  local?: string;
  round_match_number: number;
  home_score: number;
  away_score: number;
  home_team?: {
    id: string;
    name: string;
    abbreviation: string;
  };
  away_team?: {
    id: string;
    name: string;
    abbreviation: string;
  };
  round?: {
    id: string;
    name: string;
  };
}
