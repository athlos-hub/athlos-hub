export interface TeamBasicInfo {
  id: string;
  name: string;
  logo?: string;
  logo_url?: string | null;
  abbreviation?: string;
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
  /** Presente em jogos de fase de grupos; ausente no mata-mata. */
  group_id?: string | null;
  group_name?: string;
  round_number_match: number;
  competition_name?: string;
  /** Se false, apenas placar/chat/eventos (sem player de vídeo). */
  transmit_video?: boolean;
  /** ID do match que é feeder para home_team (eliminação) */
  home_feeder_match_id?: string | null;
  /** ID do match que é feeder para away_team (eliminação) */
  away_feeder_match_id?: string | null;
}

export interface MultipleMatchesDetailResponse {
  matches: MatchDetail[];
}