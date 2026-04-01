import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAthleteProfileByKeycloakId, getOrCreateAthleteProfile } from "@/actions/athlete-profile";
import { getAthletePostsByKeycloakId } from "@/actions/athlete-posts";
import { getUserPublicInfo } from "@/actions/users";
import { UnifiedProfileClient } from "@/components/profile/unified-profile-client";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "@/lib/seo/site";

interface AthleteProfilePageProps {
  params: Promise<{
    keycloakId: string;
  }>;
}

export async function generateMetadata({
  params,
}: AthleteProfilePageProps): Promise<Metadata> {
  const { keycloakId } = await params;
  return buildPageMetadata({
    title: "Perfil",
    description:
      "Perfil de atleta no AthlosHub: estatísticas, publicações e informações públicas.",
    path: `/profile/${keycloakId}`,
    noIndex: true,
  });
}

export default async function AthleteProfilePage({ params }: AthleteProfilePageProps) {
  const { keycloakId } = await params;
  const session = await getServerSession(authOptions);
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
      postsResponse = await getAthletePostsByKeycloakId(keycloakId, 0, 10);
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
  } catch (error) {
    notFound();
  }
}
