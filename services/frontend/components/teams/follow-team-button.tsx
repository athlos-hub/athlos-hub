"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { toggleFollowTeam, checkIsFollowingTeam } from "@/actions/team-follow";

interface FollowTeamButtonProps {
  teamId: string;
}

export function FollowTeamButton({ teamId }: FollowTeamButtonProps) {
  const { data: session } = useSession();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    if (session?.user) {
      checkIsFollowingTeam(teamId)
        .then((result) => {
          setIsFollowing(result);
        })
        .catch(() => {
          setIsFollowing(false);
        })
        .finally(() => {
          setIsCheckingStatus(false);
        });
    } else {
      setIsCheckingStatus(false);
    }
  }, [teamId, session?.user]);

  const handleToggle = async () => {
    if (!session?.user) {
      toast.error("Você precisa estar logado para seguir equipes");
      return;
    }

    setIsLoading(true);
    try {
      const nowFollowing = await toggleFollowTeam(teamId);

      setIsFollowing(nowFollowing);
      toast.success(
        nowFollowing ? "Agora você está seguindo esta equipe!" : "Deixou de seguir"
      );

      const event = new CustomEvent("team:follow-changed", {
        detail: { teamId, following: nowFollowing },
      });
      window.dispatchEvent(event);
    } catch {
      toast.error("Erro ao atualizar");
    } finally {
      setIsLoading(false);
    }
  };

  if (!session?.user) {
    return null;
  }

  if (isCheckingStatus) {
    return (
      <Button size="sm" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Carregando...
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={handleToggle}
      disabled={isLoading}
      className={
        !isFollowing
          ? "bg-main hover:bg-main/90 text-white"
          : "bg-red-600 hover:bg-red-600 text-white"
      }
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
