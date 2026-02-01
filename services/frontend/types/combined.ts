import type { Live } from "@/types/livestream";
import type { MatchDetail } from "./match";

export interface LiveWithMatchData extends Live {
  matchData?: MatchDetail;
}

export function hasMatchData(live: Live | LiveWithMatchData): live is LiveWithMatchData {
  return 'matchData' in live && live.matchData !== undefined;
}