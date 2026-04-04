import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProfileRedirectPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=%2Fprofile");
  }

  const username = (session.user as any).username;

  if (!username) {
    // Fallback para keycloakId se username não estiver disponível
    const keycloakId = (session.user as any).keycloakId;
    if (keycloakId) {
      redirect(`/profile/${keycloakId}`);
    }
    redirect("/auth/login?callbackUrl=%2Fprofile");
  }

  redirect(`/profile/${username}`);
}
