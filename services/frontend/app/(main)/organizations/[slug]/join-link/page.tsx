import { JoinViaLinkClient } from "@/components/organizations/join-via-link-client";
import type { Metadata } from "next";
import { privateAreaMetadata } from "@/lib/seo/site";

interface JoinLinkPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const metadata: Metadata = privateAreaMetadata(
  "Entrar na organização",
  "Confirme seu acesso à organização no AthlosHub."
);

export default async function JoinLinkPage({ params }: JoinLinkPageProps) {
  const { slug } = await params;
  
  return <JoinViaLinkClient organizationSlug={slug} />;
}
