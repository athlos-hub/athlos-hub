import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
        const team = await getTeamById(id, false);
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
    
    try {
        const session = await getServerSession(authOptions);
        const team = await getTeamById(id, !!session);
        
        return <TeamDetailClient team={team} />;
    } catch (error) {
        console.error(`[TEAM-PAGE] Erro ao carregar time "${id}":`, error);
        notFound();
    }
}
