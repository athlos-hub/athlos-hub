"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LivePlayer } from "@/components/livestream/live-player";
import { LiveChat } from "@/components/livestream/live-chat";
import { LiveEvents } from "@/components/livestream/live-events";
import { LiveStatusDisplay } from "@/components/livestream/live-status-display";
import { StreamKeyDisplay } from "@/components/livestream/stream-key-display";
import { Skeleton } from "@/components/ui/skeleton";
import { getLiveById, finishLive, cancelLive } from "@/actions/lives";
import { useLiveStatus } from "@/hooks/use-live-status";
import type { Live } from "@/types/livestream";
import { toast } from "sonner";
import { ArrowLeft, Square, X } from "lucide-react";
import Link from "next/link";

export default function LiveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [initialLive, setInitialLive] = useState<Live | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const liveId = params?.id as string;

  const { live, updateLive, isConnected } = useLiveStatus(liveId, initialLive);

  useEffect(() => {
    async function loadLive() {
      if (!liveId) return;

      try {
        const data = await getLiveById(liveId);
        setInitialLive(data);
        updateLive(data);
      } catch (error) {
        console.error("Erro ao carregar live:", error);
        toast.error("Erro ao carregar live");
      } finally {
        setIsLoading(false);
      }
    }

    loadLive();
  }, [liveId]);

  const handleFinish = async () => {
    if (!liveId || isUpdating) return;

    const confirmed = window.confirm(
      "⚠️ Tem certeza que deseja ENCERRAR esta live?\n\n" +
      "Isso irá:\n" +
      "- Parar a transmissão imediatamente\n" +
      "- Desconectar todos os espectadores\n" +
      "- Mudar o status para 'Finalizada'\n\n" +
      "Esta ação NÃO pode ser desfeita!"
    );
    
    if (!confirmed) return;

    setIsUpdating(true);
    try {
      const updatedLive = await finishLive(liveId);
      updateLive(updatedLive);
      toast.success("Live finalizada com sucesso!");
    } catch (error) {
      console.error("Erro ao finalizar live:", error);
      toast.error("Erro ao finalizar live");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!liveId || isUpdating) return;

    const confirmed = window.confirm("Tem certeza que deseja cancelar esta live?");
    if (!confirmed) return;

    setIsUpdating(true);
    try {
      const updatedLive = await cancelLive(liveId);
      updateLive(updatedLive);
      toast.success("Live cancelada com sucesso!");
    } catch (error) {
      console.error("Erro ao cancelar live:", error);
      toast.error("Erro ao cancelar live");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 space-y-6">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!live) {
    return (
      <div className="py-8 flex flex-col items-center justify-center space-y-4">
        <p className="text-muted-foreground">Live não encontrada</p>
        <Link href="/jogos">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/jogos">
          <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Voltar</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          {live.status === "scheduled" && (
            <Button
              onClick={handleCancel}
              disabled={isUpdating}
              variant="outline"
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Cancelar
            </Button>
          )}

          {live.status === "live" && (
            <Button
              onClick={handleFinish}
              disabled={isUpdating}
              variant="destructive"
              className="gap-2"
            >
              <Square className="w-4 h-4" />
              Encerrar Live
            </Button>
          )}
        </div>
      </div>

      <LiveStatusDisplay 
        status={live.status}
        startedAt={live.startedAt}
        endedAt={live.endedAt}
      />

      {(live.status === "scheduled" || live.status === "live") && (
        <StreamKeyDisplay streamKey={live.streamKey} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[720px]">
          <LivePlayer live={live} />
        </div>

        <div className="lg:col-span-1 h-[720px]">
          <LiveChat
            liveId={liveId}
            userId={session?.user?.id || null}
            userName={session?.user?.name || null}
            isAuthenticated={!!session?.user}
            liveStatus={live.status}
          />
        </div>
      </div>

      <LiveEvents liveId={liveId} liveStatus={live.status} />
    </div>
  );
}
