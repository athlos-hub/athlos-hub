import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug } from "@/actions/organizations";
import { OrganizationDetailClient } from "@/components/organizations/organization-detail-client";

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
        console.error(`[ORG-PAGE] Erro ao carregar organização "${slug}":`, error);
        notFound();
    }
}
