import { Metadata } from "next";
import { notFound } from "next/navigation";

/** Evita cache de RSC com escudo antigo após troca de logo. */
export const dynamic = "force-dynamic";
import { getTeamById } from "@/actions/teams";
import { TeamDetailClient } from "@/components/teams/team-detail-client";

interface TeamPageProps {
    params: Promise<{
        id: string;
    }>;
}

export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
    try {
        const { id } = await params;
        const team = await getTeamById(id);
        return {
            title: `${team.name} - AthlosHub`,
            description: `Time ${team.name} (${team.abbreviation})`,
        };
    } catch {
        return {
            title: "Time não encontrado",
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
