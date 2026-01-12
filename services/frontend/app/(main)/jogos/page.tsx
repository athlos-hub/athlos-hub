"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LiveCard } from "@/components/livestream/live-card";
import { Skeleton } from "@/components/ui/skeleton";
import { listLives } from "@/actions/lives";
import type { Live } from "@/types/livestream";
import { Plus } from "lucide-react";

export default function LivesPage() {
  const [lives, setLives] = useState<Live[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadLives() {
      try {
        const data = await listLives();
        setLives(data);
      } catch (error) {
        console.error("Erro ao carregar lives:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadLives();
  }, []);

  return (
    <div className="min-h-screen space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jogos</h1>
          <p className="text-muted-foreground mt-1">
            Assista as transmissões ao vivo da sua equipe preferida
          </p>
        </div>
        <Link href="/jogos/new">
          <Button className="gap-2 bg-main hover:bg-main/90 text-white">
            <Plus className="w-4 h-4" />
            Nova Live
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : lives.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <p className="text-muted-foreground">Nenhuma live encontrada</p>
          <Link href="/jogos/new">
            <Button className="gap-2 bg-main hover:bg-main/90 text-white">
              <Plus className="w-4 h-4" />
              Criar Primeira Live
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lives.map((live) => (
            <LiveCard key={live.id} live={live} />
          ))}
        </div>
      )}
    </div>
  );
}
