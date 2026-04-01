import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrganizationBySlug, getOrganizations } from "@/actions/organizations";
import { OrganizationDetailClient } from "@/components/organizations/organization-detail-client";
import { OrganizationPrivacy } from "@/types/organization";
import { buildPageMetadata } from "@/lib/seo/site";

interface OrganizationPageProps {
    params: Promise<{
        slug: string;
    }>;
}

export async function generateMetadata({ params }: OrganizationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  try {
    // Mesma regra da página: org privada exige requisição autenticada para o backend aceitar.
    const org = await getOrganizationBySlug(slug, !!session);
    const description =
      org.description?.trim() ||
      `Organização esportiva ${org.name} no AthlosHub — competições, modalidades e comunidade.`;
    return buildPageMetadata({
      title: org.name,
      description,
      path: `/organizations/${slug}`,
      ogImage: org.logo_url ?? null,
    });
  } catch {
    return {
      title: "Organização não encontrada",
      robots: { index: false, follow: false },
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
