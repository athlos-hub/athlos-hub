import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTeamById } from "@/actions/teams";
import { TeamDetailClient } from "@/components/teams/team-detail-client";
import { SITE_NAME, buildPageMetadata } from "@/lib/seo/site";

/** Evita cache de RSC com escudo antigo após troca de logo. */
export const dynamic = "force-dynamic";

interface TeamPageProps {
    params: Promise<{
        id: string;
    }>;
}

export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const team = await getTeamById(id);
    const description = `${team.name} (${team.abbreviation}) — equipe no ${SITE_NAME}. Veja elenco, competição e status.`;
    return buildPageMetadata({
      title: team.name,
      description,
      path: `/clubes/${id}`,
      ogImage: team.logo_url ?? null,
    });
  } catch {
    return {
      title: "Time não encontrado",
      robots: { index: false, follow: false },
    };
  }
}

export default async function TeamPage({ params }: TeamPageProps) {
    const { id } = await params;

    let team;
    try {
        team = await getTeamById(id);
    } catch (error) {
        console.error(`[TEAM-PAGE] Erro ao carregar time "${id}":`, error);
        notFound();
    }

    // `id` pode ser o UUID do auth ou o do competitions (external_team_id);
    // o `team` retornado é sempre o do auth, com logo_url e nome corretos.
    return <TeamDetailClient team={team} />;
}
