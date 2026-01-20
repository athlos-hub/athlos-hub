"use client";

import { useEffect, useState, useMemo } from "react";
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
  createGoogleCalendarEventWithForce,
  createMultipleGoogleCalendarEvents,
  checkGoogleCalendarEventsExistence,
  getGoogleCalendarOAuthUrl,
} from "@/actions/lives";
import type { Live } from "@/types/livestream";
import { LiveStatus } from "@/types/livestream";
import { Plus, Calendar, CalendarCheck, CalendarX, Filter } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

export default function LivesPage() {
  const [allLives, setAllLives] = useState<Live[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLives, setSelectedLives] = useState<Set<string>>(new Set());
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [isGoogleCalendarAuthorized, setIsGoogleCalendarAuthorized] = useState<boolean | null>(null);
  const [showAlreadyAddedDialog, setShowAlreadyAddedDialog] = useState(false);
  const [pendingLiveToForce, setPendingLiveToForce] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<LiveStatus | "all">("all");

  useEffect(() => {
    async function loadLives() {
      try {
        const data = await listLives();
        setAllLives(data);
      } catch (error) {
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
        setIsGoogleCalendarAuthorized(false);
      }
    }

    loadLives();
    checkGoogleCalendarAuth();
  }, []);

  const [calendarEventSet, setCalendarEventSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchEventExistence() {
      if (isGoogleCalendarAuthorized === false) return;
      if (allLives.length === 0) return;

      const schedulableIds = allLives.filter((l) => l.status === LiveStatus.SCHEDULED).map((l) => l.id);
      if (schedulableIds.length === 0) return;

      try {
        const results: Array<{ liveId: string; exists: boolean; eventId: string; htmlLink: string }> = await checkGoogleCalendarEventsExistence(schedulableIds);
        const set = new Set<string>(results.filter((r) => r.exists).map((r) => r.liveId));
        setCalendarEventSet(set);
      } catch (error) {
      }
    }

    fetchEventExistence();
  }, [allLives, isGoogleCalendarAuthorized]);

  const lives = useMemo(() => {
    const statusPriority: Record<string, number> = {
      [LiveStatus.LIVE]: 0,
      [LiveStatus.SCHEDULED]: 1,
      [LiveStatus.FINISHED]: 2,
      [LiveStatus.CANCELLED]: 3,
    };

    const sortByStatus = (a: Live, b: Live) => {
      const priorityA = statusPriority[a.status] ?? 99;
      const priorityB = statusPriority[b.status] ?? 99;
      return priorityA - priorityB;
    };

    if (statusFilter === "all") {
      return [...allLives].sort(sortByStatus);
    }
    return allLives.filter((live) => live.status === statusFilter as LiveStatus);
  }, [allLives, statusFilter]);

  const scheduledLives = useMemo(() => {
    return allLives.filter((live) => live.status === LiveStatus.SCHEDULED);
  }, [allLives]);

  const handleSelectLive = (liveId: string, checked: boolean) => {
    const live = allLives.find((l) => l.id === liveId);
    
    if (checked && live?.status !== LiveStatus.SCHEDULED) {
      toast.warning("Apenas lives agendadas podem ser adicionadas ao calendário");
      return;
    }

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
      const schedulableLives = lives.filter((live) => live.status === LiveStatus.SCHEDULED);
      setSelectedLives(new Set(schedulableLives.map((live) => live.id)));
    } else {
      setSelectedLives(new Set());
    }
  };

  const handleAddToCalendar = async (liveId: string) => {
    const live = allLives.find((l) => l.id === liveId);
    if (live?.status !== LiveStatus.SCHEDULED) {
      toast.warning("Apenas lives agendadas podem ser adicionadas ao calendário");
      return;
    }

    try {
      setIsAddingToCalendar(true);

      if (!isGoogleCalendarAuthorized) {
        const oauthUrl = await getGoogleCalendarOAuthUrl(`/jogos`);
        window.location.href = oauthUrl;
        return;
      }

      const result = await createGoogleCalendarEvent(liveId);

      if (result.alreadyExists) {
        setPendingLiveToForce(liveId);
        setShowAlreadyAddedDialog(true);
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
    const schedulableIds = Array.from(selectedLives).filter((id) => {
      const live = allLives.find((l) => l.id === id);
      return live?.status === LiveStatus.SCHEDULED;
    });

    if (schedulableIds.length === 0) {
      toast.error("Selecione pelo menos uma live agendada para adicionar ao calendário");
      return;
    }

    if (schedulableIds.length < selectedLives.size) {
      const nonScheduledCount = selectedLives.size - schedulableIds.length;
      toast.warning(`${nonScheduledCount} live(s) não estão agendadas e serão ignoradas`);
    }

    try {
      setIsAddingToCalendar(true);

      if (!isGoogleCalendarAuthorized) {
        const oauthUrl = await getGoogleCalendarOAuthUrl(`/jogos`);
        window.location.href = oauthUrl;
        return;
      }

      const result = await createMultipleGoogleCalendarEvents(schedulableIds);

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

  const handleForceAdd = async () => {
    if (!pendingLiveToForce) return;

    try {
      setIsAddingToCalendar(true);
      const result = await createGoogleCalendarEventWithForce(pendingLiveToForce, true);
      if (result.success) {
        toast.success('Evento adicionado ao Google Calendar com sucesso!');
      } else {
        toast.error('Não foi possível adicionar o evento');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Não foi possível adicionar ao Google Calendar';
      toast.error(errorMessage);
    } finally {
      setIsAddingToCalendar(false);
      setShowAlreadyAddedDialog(false);
      setPendingLiveToForce(null);
    }
  };

  const schedulableLives = lives.filter((live) => live.status === LiveStatus.SCHEDULED);
  const hasSelection = selectedLives.size > 0;
  const allSelected = schedulableLives.length > 0 && selectedLives.size === schedulableLives.length;

  return (
    <>
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

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-main text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setStatusFilter(LiveStatus.SCHEDULED)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === LiveStatus.SCHEDULED
                  ? "bg-main text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Agendadas
            </button>
            <button
              onClick={() => setStatusFilter(LiveStatus.LIVE)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === LiveStatus.LIVE
                  ? "bg-main text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Ao Vivo
            </button>
            <button
              onClick={() => setStatusFilter(LiveStatus.FINISHED)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === LiveStatus.FINISHED
                  ? "bg-main text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Finalizadas
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : lives.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <p className="text-muted-foreground text-lg mb-4">
            Nenhuma live {statusFilter !== "all" ? `com status "${statusFilter}"` : ""} encontrada
          </p>
          {allLives.length === 0 && (
            <Link href="/jogos/new">
              <Button className="gap-2 bg-main hover:bg-main/90 text-white">
                <Plus className="w-4 h-4" />
                Criar Primeira Live
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {schedulableLives.length > 0 && (
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
                    Selecionar agendadas ({selectedLives.size}/{schedulableLives.length})
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lives.map((live) => (
              <LiveCard
                key={live.id}
                live={live}
                isSelected={selectedLives.has(live.id)}
                onSelect={(checked) => handleSelectLive(live.id, checked)}
        onAddToCalendar={() => handleAddToCalendar(live.id)}
                isAddingToCalendar={isAddingToCalendar}
          canAddToCalendar={live.status === LiveStatus.SCHEDULED}
          hasCalendarEvent={calendarEventSet.has(live.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
      <AlertDialog open={showAlreadyAddedDialog} onOpenChange={setShowAlreadyAddedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Jogo já adicionado</AlertDialogTitle>
            <AlertDialogDescription>
              Este jogo já foi adicionado ao seu Google Calendar. Deseja adicioná-lo novamente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAddingToCalendar}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceAdd} disabled={isAddingToCalendar} className="bg-main hover:bg-main/90 text-white">
              Adicionar novamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

