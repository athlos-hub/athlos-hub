"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LiveCard } from "@/components/livestream/live-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listLives,
  generateGoogleCalendarUrl,
  generateMultipleGoogleCalendarUrls,
  getGoogleCalendarOAuthStatus,
  createGoogleCalendarEvent,
  createMultipleGoogleCalendarEvents,
  getGoogleCalendarOAuthUrl,
} from "@/actions/lives";
import type { Live } from "@/types/livestream";
import { Plus, Calendar, CalendarCheck, CalendarX } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export default function LivesPage() {
  const [lives, setLives] = useState<Live[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLives, setSelectedLives] = useState<Set<string>>(new Set());
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [isGoogleCalendarAuthorized, setIsGoogleCalendarAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    async function loadLives() {
      try {
        const data = await listLives();
        setLives(data);
      } catch (error) {
        console.error("Erro ao carregar lives:", error);
        toast.error("Não foi possível carregar as lives");
      } finally {
        setIsLoading(false);
      }
    }

    async function checkGoogleCalendarAuth() {
      try {
        const status = await getGoogleCalendarOAuthStatus();
        setIsGoogleCalendarAuthorized(status.authorized);
      } catch (error) {
        console.error("Erro ao verificar autorização Google Calendar:", error);
        setIsGoogleCalendarAuthorized(false);
      }
    }

    loadLives();
    checkGoogleCalendarAuth();
  }, []);

  const handleSelectLive = (liveId: string, checked: boolean) => {
    const newSelected = new Set(selectedLives);
    if (checked) {
      newSelected.add(liveId);
    } else {
      newSelected.delete(liveId);
    }
    setSelectedLives(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLives(new Set(lives.map((live) => live.id)));
    } else {
      setSelectedLives(new Set());
    }
  };

  const handleAddToCalendar = async (liveId: string) => {
    try {
      setIsAddingToCalendar(true);

      if (!isGoogleCalendarAuthorized) {
        const oauthUrl = await getGoogleCalendarOAuthUrl(`/jogos`);
        window.location.href = oauthUrl;
        return;
      }

      const result = await createGoogleCalendarEvent(liveId);
      
      if (result.alreadyExists) {
        toast.info("Este jogo já foi adicionado ao seu Google Calendar");
      } else {
        toast.success("Evento adicionado ao Google Calendar com sucesso!");
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Não foi possível adicionar ao Google Calendar";
      
      if (errorMessage.includes("não autorizado") || errorMessage.includes("authorized")) {
        const oauthUrl = await getGoogleCalendarOAuthUrl(`/jogos`);
        window.location.href = oauthUrl;
        return;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsAddingToCalendar(false);
    }
  };

  const handleAddMultipleToCalendar = async () => {
    if (selectedLives.size === 0) {
      toast.error("Selecione pelo menos uma live para adicionar ao calendário");
      return;
    }

    try {
      setIsAddingToCalendar(true);

      if (!isGoogleCalendarAuthorized) {
        const oauthUrl = await getGoogleCalendarOAuthUrl(`/jogos`);
        window.location.href = oauthUrl;
        return;
      }

      const liveIds = Array.from(selectedLives);
      const result = await createMultipleGoogleCalendarEvents(liveIds);

      const newEventsCount = result.results.filter((r) => r.success && !r.alreadyExists).length;
      const existingEventsCount = result.results.filter((r) => r.success && r.alreadyExists).length;
      const failCount = result.results.filter((r) => !r.success).length;

      if (newEventsCount > 0) {
        toast.success(`${newEventsCount} evento(s) adicionado(s) ao Google Calendar com sucesso!`);
      }

      if (existingEventsCount > 0) {
        toast.info(`${existingEventsCount} jogo(s) já estavam no seu Google Calendar`);
      }

      if (failCount > 0) {
        toast.warning(`${failCount} evento(s) falharam ao ser adicionados`);
      }

      setSelectedLives(new Set());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Não foi possível adicionar ao Google Calendar";
      
      if (errorMessage.includes("não autorizado") || errorMessage.includes("authorized")) {
        const oauthUrl = await getGoogleCalendarOAuthUrl(`/jogos`);
        window.location.href = oauthUrl;
        return;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsAddingToCalendar(false);
    }
  };

  const hasSelection = selectedLives.size > 0;
  const allSelected = lives.length > 0 && selectedLives.size === lives.length;

  return (
    <div className="min-h-screen space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Jogos</h1>
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

      {!isLoading && lives.length > 0 && (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-4 h-14 px-4 whitespace-nowrap overflow-hidden">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                id="select-all"
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium cursor-pointer"
              >
                Selecionar todas ({selectedLives.size}/{lives.length})
              </label>
            </div>
            {hasSelection && (
              <Button
                onClick={handleAddMultipleToCalendar}
                disabled={isAddingToCalendar}
                className="gap-2"
                variant="outline"
              >
                <CalendarCheck className="w-4 h-4" />
                Adicionar {selectedLives.size} ao Calendário
              </Button>
            )}
            {isGoogleCalendarAuthorized === false && (
              <Button
                onClick={async () => {
                  const oauthUrl = await getGoogleCalendarOAuthUrl("/jogos");
                  window.location.href = oauthUrl;
                }}
                className="gap-2"
                variant="outline"
              >
                <Calendar className="w-4 h-4" />
                Conectar Google Calendar
              </Button>
            )}
            {isGoogleCalendarAuthorized === true && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CalendarCheck className="w-4 h-4" />
                Google Calendar conectado
              </div>
            )}
          </div>
        </div>
      )}

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
            <LiveCard
              key={live.id}
              live={live}
              isSelected={selectedLives.has(live.id)}
              onSelect={(checked) => handleSelectLive(live.id, checked)}
              onAddToCalendar={() => handleAddToCalendar(live.id)}
              isAddingToCalendar={isAddingToCalendar}
            />
          ))}
        </div>
      )}
    </div>
  );
}
