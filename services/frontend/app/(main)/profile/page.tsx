import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProfileRedirectPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const keycloakId = (session.user as any).keycloakId;

  if (!keycloakId) {
    redirect("/login");
  }

  redirect(`/profile/${keycloakId}`);
}
