export interface SegmentScore {
  segment_id: string;
  segment_number: number;
  segment_type: string;
  home_score: number;
  away_score: number;
  finished: boolean;
}

export interface Scoreboard {
  match_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_name: string | null;
  away_team_name: string | null;
  home_team_logo_url?: string | null;
  away_team_logo_url?: string | null;
  home_total_score: number;
  away_total_score: number;
  segments: SegmentScore[];
  status: string;
}
