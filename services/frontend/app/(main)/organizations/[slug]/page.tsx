import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug, getOrganizations } from "@/actions/organizations";
import { OrganizationDetailClient } from "@/components/organizations/organization-detail-client";
import { OrganizationPrivacy } from "@/types/organization";

interface OrganizationPageProps {
    params: Promise<{
        slug: string;
    }>;
}

export async function generateMetadata({ params }: OrganizationPageProps): Promise<Metadata> {
    try {
        const { slug } = await params;
        const org = await getOrganizationBySlug(slug, false);
        return {
            title: `${org.name} - AthlosHub`,
            description: org.description || `Organização ${org.name}`,
        };
    } catch {
        return {
            title: "Organização não encontrada",
        };
    }
}

export default async function OrganizationPage({ params }: OrganizationPageProps) {
    const { slug } = await params;
    
    try {
        const session = await getServerSession(authOptions);
        const organization = await getOrganizationBySlug(slug, !!session);
        
        return <OrganizationDetailClient organization={organization} />;
    } catch (error) {
        try {
            const session = await getServerSession(authOptions);
            if (!session) {
                console.error(`[ORG-PAGE] Erro ao carregar organização "${slug}":`, error);
                notFound();
            }

            // Fallback para evitar 404 em organizações privadas sem vínculo:
            // se ela existir na listagem autenticada, mostra tela de acesso restrito.
            const firstPage = await getOrganizations(undefined, 200, 0, true);
            const listed = firstPage.find((org) => org.slug === slug);
            if (listed?.privacy === OrganizationPrivacy.PRIVATE) {
                return <OrganizationDetailClient organization={listed} />;
            }
        } catch (fallbackError) {
            console.error(`[ORG-PAGE] Falha no fallback "${slug}":`, fallbackError);
        }

        console.error(`[ORG-PAGE] Erro ao carregar organização "${slug}":`, error);
        notFound();
    }
}
