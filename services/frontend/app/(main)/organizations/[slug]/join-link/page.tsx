import { JoinViaLinkClient } from "@/components/organizations/join-via-link-client";
import { Metadata } from "next";

interface JoinLinkPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const metadata: Metadata = {
  title: "Entrando na Organização - AthlosHub",
  description: "Processando convite para organização",
};

export default async function JoinLinkPage({ params }: JoinLinkPageProps) {
  const { slug } = await params;
  
  return <JoinViaLinkClient organizationSlug={slug} />;
}
