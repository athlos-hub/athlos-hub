import type { Live } from "@/types/livestream";
import type { MatchDetail } from "@/types/match";
import type { Post as SocialPost } from "@/types/social";
import { ProfileType } from "@/types/social";
import type {
  HomeFeedPost,
  HomeLiveGame,
  HomeUpcomingGame,
} from "@/types/home-page";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseBackendIsoToDate } from "@/lib/datetime/parse-backend-iso";

export function shortNameFromLabel(name: string, max = 4): string {
  const t = name.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].slice(0, 2) + parts[1].slice(0, 2)).toUpperCase().slice(0, max);
  }
  return t.slice(0, max).toUpperCase();
}

function modalityFromMatch(m: MatchDetail): string {
  return m.round_name?.trim() || m.group_name?.trim() || "Partida";
}

export function matchAndLiveToHomeGame(live: Live, match: MatchDetail): HomeLiveGame | null {
  if (!match.home_team || !match.away_team) return null;
  return {
    id: live.id,
    competition: {
      id: String(match.competition_id),
      name: match.competition_name?.trim() || `Competição #${match.competition_id}`,
      modality: modalityFromMatch(match),
    },
    homeTeam: {
      id: match.home_team.id,
      name: match.home_team.name,
      shortName: shortNameFromLabel(match.home_team.name),
      crestUrl: match.home_team.logo_url ?? match.home_team.logo,
    },
    awayTeam: {
      id: match.away_team.id,
      name: match.away_team.name,
      shortName: shortNameFromLabel(match.away_team.name),
      crestUrl: match.away_team.logo_url ?? match.away_team.logo,
    },
    homeScore: match.home_score,
    awayScore: match.away_score,
    statusLabel: "Ao vivo",
    detailHref: `/jogos/${live.id}`,
  };
}

export function matchAndLiveToUpcoming(
  live: Live,
  match: MatchDetail
): HomeUpcomingGame | null {
  if (!match.scheduled_datetime) return null;
  if (!match.home_team || !match.away_team) return null;
  const start = new Date(match.scheduled_datetime);
  if (Number.isNaN(start.getTime())) return null;

  return {
    id: live.id,
    competition: {
      id: String(match.competition_id),
      name: match.competition_name?.trim() || `Competição #${match.competition_id}`,
      modality: modalityFromMatch(match),
    },
    homeTeam: {
      id: match.home_team.id,
      name: match.home_team.name,
      shortName: shortNameFromLabel(match.home_team.name),
      crestUrl: match.home_team.logo_url ?? match.home_team.logo,
    },
    awayTeam: {
      id: match.away_team.id,
      name: match.away_team.name,
      shortName: shortNameFromLabel(match.away_team.name),
      crestUrl: match.away_team.logo_url ?? match.away_team.logo,
    },
    startsAt: match.scheduled_datetime,
    competitionHref: `/competitions/${match.competition_id}`,
  };
}

export function socialPostToHomeFeedPost(
  post: SocialPost,
  author: { name: string; avatarUrl?: string; initials: string }
): HomeFeedPost {
  let relativeTime = "";
  try {
    relativeTime = formatDistanceToNow(parseBackendIsoToDate(post.createdAt), {
      addSuffix: true,
      locale: ptBR,
    });
  } catch {
    relativeTime = "";
  }
  return {
    id: post.id,
    authorName: author.name,
    authorAvatarUrl: author.avatarUrl,
    authorInitials: author.initials.slice(0, 3),
    relativeTime,
    body: post.content,
    likes: post.likesCount ?? 0,
    comments: post.commentsCount ?? 0,
    href: `/social/post/${post.id}`,
  };
}

export function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}
