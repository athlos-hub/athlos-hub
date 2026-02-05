import { JoinTeamInviteClient } from "@/components/teams/join-team-invite-client";
import { Metadata } from "next";

interface TeamInvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

export const metadata: Metadata = {
  title: "Convite de Time - AthlosHub",
  description: "Aceite o convite para entrar em um time",
};

export default async function TeamInvitePage({ params }: TeamInvitePageProps) {
  const { token } = await params;
  
  return <JoinTeamInviteClient inviteToken={token} />;
}
