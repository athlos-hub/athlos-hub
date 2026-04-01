import { JoinTeamInviteClient } from "@/components/teams/join-team-invite-client";
import type { Metadata } from "next";
import { privateAreaMetadata } from "@/lib/seo/site";

interface TeamInvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

export const metadata: Metadata = privateAreaMetadata(
  "Convite para time",
  "Aceite o convite para entrar em uma equipe no AthlosHub."
);

export default async function TeamInvitePage({ params }: TeamInvitePageProps) {
  const { token } = await params;
  
  return <JoinTeamInviteClient inviteToken={token} />;
}
