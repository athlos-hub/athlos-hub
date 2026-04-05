"use server";

import { listLives } from "@/actions/lives";
import { getMatchesByIds } from "@/actions/matches";
import { getPublicFeed } from "@/actions/social-feed";
import { getOrganizationBySlug } from "@/actions/organizations";
import { getTeamDisplayForSocialPost } from "@/actions/teams";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserPublicInfo } from "@/actions/users";
import {
  matchAndLiveToHomeGame,
  matchAndLiveToUpcoming,
  pickOrganizationLogoUrl,
  socialPostToHomeFeedPost,
  initialsFromName,
} from "@/lib/home/map-home-data";
import type { HomePageData } from "@/types/home-page";
import { LiveStatus } from "@/types/livestream";
import type { Post as SocialPost } from "@/types/social";
import { PostVisibility, ProfileType } from "@/types/social";

async function resolvePostAuthor(
  post: SocialPost,
  withAuth: boolean
): Promise<{
  name: string;
  avatarUrl?: string;
  initials: string;
}> {
  try {
    if (post.profileType === ProfileType.ORGANIZATION) {
      const org = await getOrganizationBySlug(post.profileId, withAuth);
      return {
        name: org.name,
        avatarUrl: pickOrganizationLogoUrl(org as { logo_url?: string | null; logoUrl?: string | null }) ?? undefined,
        initials: initialsFromName(org.name),
      };
    }
    if (post.profileType === ProfileType.TEAM) {
      try {
        const d = await getTeamDisplayForSocialPost(post.profileId);
        return {
          name: d.name,
          avatarUrl: d.logoUrl ?? undefined,
          initials: initialsFromName(d.name),
        };
      } catch {
        return { name: "Time", initials: "TM" };
      }
    }
    const u = await getUserPublicInfo(post.createdByKeycloakId);
    if (u) {
      const name =
        [u.first_name, u.last_name].filter(Boolean).join(" ").trim() ||
        u.username;
      return {
        name,
        avatarUrl: u.avatar_url ?? undefined,
        initials: initialsFromName(name),
      };
    }
  } catch {
    // feed público / auth opcional
  }
  return { name: "Comunidade", initials: "CO" };
}

/**
 * Agrega dados reais para a home (lives + partidas + feed público).
 */
export async function getHomePageData(): Promise<HomePageData> {
  const empty: HomePageData = {
    liveGames: [],
    upcomingGames: [],
    feedPosts: [],
  };

  try {
    const allLives = await listLives();
    const liveOnes = allLives.filter((l) => l.status === LiveStatus.LIVE);
    const scheduledOnes = allLives.filter(
      (l) => l.status === LiveStatus.SCHEDULED
    );

    const liveIds = liveOnes
      .map((l) => l.externalMatchId)
      .filter((id): id is string => Boolean(id && id.length > 0));
    const scheduledIds = scheduledOnes
      .map((l) => l.externalMatchId)
      .filter((id): id is string => Boolean(id && id.length > 0));

    const uniqueMatchIds = [...new Set([...liveIds, ...scheduledIds])];

    let matches: Awaited<ReturnType<typeof getMatchesByIds>> = [];
    if (uniqueMatchIds.length > 0) {
      try {
        matches = await getMatchesByIds(uniqueMatchIds);
      } catch {
        matches = [];
      }
    }

    const byMatchId = new Map(matches.map((m) => [m.id, m]));

    const liveGames = liveOnes
      .map((live) => {
        const m = byMatchId.get(live.externalMatchId);
        if (!m) return null;
        return matchAndLiveToHomeGame(live, m);
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);

    const now = Date.now();
    const upcomingRaw = scheduledOnes
      .map((live) => {
        const m = byMatchId.get(live.externalMatchId);
        if (!m) return null;
        return matchAndLiveToUpcoming(live, m);
      })
      .filter((g): g is NonNullable<typeof g> => g !== null)
      .filter((g) => {
        const t = new Date(g.startsAt).getTime();
        return !Number.isNaN(t) && t > now;
      })
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      )
      .slice(0, 6);

    let feedPosts: HomePageData["feedPosts"] = [];
    try {
      const session = await getServerSession(authOptions);
      const withAuth = Boolean(session?.accessToken);
      const feed = await getPublicFeed(0, 24);
      const publicOnly = (feed.content ?? []).filter(
        (p) => p.visibility === PostVisibility.PUBLIC
      );
      const slice = publicOnly.slice(0, 3);
      feedPosts = await Promise.all(
        slice.map(async (post) => {
          const author = await resolvePostAuthor(post, withAuth);
          return socialPostToHomeFeedPost(post, author);
        })
      );
    } catch {
      feedPosts = [];
    }

    return {
      liveGames,
      upcomingGames: upcomingRaw,
      feedPosts,
    };
  } catch {
    return empty;
  }
}
