"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { toggleFollowOrganization, checkIsFollowingOrganization } from "@/actions/organization-follow";

interface FollowOrganizationButtonProps {
  organizationSlug: string;
}

export function FollowOrganizationButton({ organizationSlug }: FollowOrganizationButtonProps) {
  const { data: session } = useSession();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    if (session?.user) {
      checkIsFollowingOrganization(organizationSlug)
        .then(setIsFollowing)
        .finally(() => setIsCheckingStatus(false));
    } else {
      setIsCheckingStatus(false);
    }
  }, [organizationSlug, session?.user]);

  const handleToggle = async () => {
    if (!session?.user) {
      toast.error("Você precisa estar logado para seguir organizações");
      return;
    }

    setIsLoading(true);
    try {
      const nowFollowing = await toggleFollowOrganization(organizationSlug);
      setIsFollowing(nowFollowing);
      toast.success(nowFollowing ? "Agora você está seguindo esta organização!" : "Deixou de seguir");
    } catch (error) {
      toast.error("Erro ao atualizar");
    } finally {
      setIsLoading(false);
    }
  };

  if (!session?.user || isCheckingStatus) {
    return null;
  }

  return (
    <Button
      size="sm"
      onClick={handleToggle}
      disabled={isLoading}
      className={!isFollowing ? "bg-main hover:bg-main/90 text-white" : "bg-red-600 hover:bg-red-600 text-white"}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : isFollowing ? (
        <UserMinus className="h-4 w-4 mr-2" />
      ) : (
        <UserPlus className="h-4 w-4 mr-2" />
      )}
      {isFollowing ? "Deixar de Seguir" : "Seguir"}
    </Button>
  );
}
