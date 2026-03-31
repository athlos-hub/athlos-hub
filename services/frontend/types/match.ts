export interface TeamBasicInfo {
  id: string;
  name: string;
  logo?: string;
}

export interface MatchDetail {
  id: string;
  competition_id: string;
  home_team?: TeamBasicInfo;
  away_team?: TeamBasicInfo;
  scheduled_datetime?: string;
  local?: string;
  status: string;
  home_score: number;
  away_score: number;
  round_name?: string;
  group_name?: string;
  round_number_match: number;
  competition_name?: string;
}

export interface MultipleMatchesDetailResponse {
  matches: MatchDetail[];
}