import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAthleteProfileByKeycloakId,
  getAthleteProfileByUsername,
  getOrCreateAthleteProfile,
} from "@/actions/athlete-profile";
import {
  getAthletePostsByKeycloakId,
  getAthletePostsByUsername,
} from "@/actions/athlete-posts";
import { getUserByUsername, getUserPublicInfo } from "@/actions/users";
import { UnifiedProfileClient } from "@/components/profile/unified-profile-client";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "@/lib/seo/site";

const KEYCLOAK_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseProfileSlug(raw: string): { kind: "keycloak"; id: string } | { kind: "username"; username: string } {
  const slug = raw.trim();
  if (KEYCLOAK_UUID_RE.test(slug)) {
    return { kind: "keycloak", id: slug };
  }
  const username = slug.startsWith("@") ? slug.slice(1) : slug;
  return { kind: "username", username };
}

interface ProfilePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { slug: raw } = await params;
  const parsed = parseProfileSlug(raw);
  if (parsed.kind === "keycloak") {
    return buildPageMetadata({
      title: "Perfil",
      description:
        "Perfil de atleta no AthlosHub: estatísticas, publicações e informações públicas.",
      path: `/profile/${parsed.id}`,
      noIndex: true,
    });
  }
  return buildPageMetadata({
    title: `Perfil de ${parsed.username}`,
    description:
      "Perfil de atleta no AthlosHub: estatísticas, publicações e informações públicas.",
    path: `/profile/${parsed.username}`,
    noIndex: true,
  });
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { slug: raw } = await params;
  const parsed = parseProfileSlug(raw);
  const session = await getServerSession(authOptions);

  if (parsed.kind === "keycloak") {
    const keycloakId = parsed.id;
    const currentUserKeycloakId = (session?.user as any)?.keycloakId;
    const isOwnProfile = currentUserKeycloakId === keycloakId;

    try {
      let athleteProfile;
      try {
        athleteProfile = await getAthleteProfileByKeycloakId(keycloakId);
      } catch {
        if (isOwnProfile) {
          athleteProfile = await getOrCreateAthleteProfile();
        } else {
          notFound();
        }
      }

      let postsResponse;
      try {
        postsResponse = await getAthletePostsByKeycloakId(keycloakId, 0, 3);
      } catch {
        postsResponse = { content: [], totalElements: 0 };
      }

      let authUserData = null;
      try {
        const userData = await getUserPublicInfo(keycloakId);
        if (userData) {
          authUserData = {
            id: userData.id,
            username: userData.username,
            email: userData.email,
            first_name: userData.first_name || null,
            last_name: userData.last_name || null,
            avatar_url: userData.avatar_url || null,
          };
        }
      } catch {
        // auth opcional
      }

      return (
        <UnifiedProfileClient
          athleteProfile={athleteProfile}
          initialPosts={postsResponse.content || []}
          totalPosts={postsResponse.totalElements || 0}
          authUserData={authUserData}
          isOwnProfile={isOwnProfile}
        />
      );
    } catch {
      notFound();
    }
  }

  const username = parsed.username;
  const currentUserUsername = (session?.user as any)?.username;
  const isOwnProfile = currentUserUsername === username;

  try {
    let athleteProfile;
    try {
      athleteProfile = await getAthleteProfileByUsername(username);
    } catch {
      if (isOwnProfile) {
        athleteProfile = await getOrCreateAthleteProfile();
      } else {
        notFound();
      }
    }

    let postsResponse;
    try {
      postsResponse = await getAthletePostsByUsername(username, 0, 3);
    } catch {
      postsResponse = { content: [], totalElements: 0 };
    }

    let authUserData = null;
    try {
      const userData = await getUserByUsername(username);
      if (userData) {
        authUserData = {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          first_name: userData.first_name || null,
          last_name: userData.last_name || null,
          avatar_url: userData.avatar_url || null,
        };
      }
    } catch {
      // Se não conseguir dados do auth, ainda mostra o perfil da social
    }

    return (
      <UnifiedProfileClient
        athleteProfile={athleteProfile}
        initialPosts={postsResponse.content || []}
        totalPosts={postsResponse.totalElements || 0}
        authUserData={authUserData}
        isOwnProfile={isOwnProfile}
      />
    );
  } catch {
    notFound();
  }
}
