"use client";

import { Achievement, AchievementBadge } from "./achievement-badge";
import { Trophy, ChevronRight } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AchievementsSectionProps {
  achievements?: Record<string, Achievement>;
  achievementsCount?: number;
  maxDisplay?: number;
}

export function AchievementsSection({
  achievements = {},
  achievementsCount = 0,
  maxDisplay = 6,
}: AchievementsSectionProps) {
  const [showAllDialog, setShowAllDialog] = useState(false);

  const achievementsList = Object.values(achievements);
  const displayedAchievements = achievementsList.slice(0, maxDisplay);
  const hasMore = achievementsList.length > maxDisplay;

  if (achievementsCount === 0) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Conquistas</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma conquista desbloqueada ainda
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold">Conquistas</h3>
            <span className="text-sm text-muted-foreground">
              ({achievementsCount})
            </span>
          </div>
          
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllDialog(true)}
              className="gap-1"
            >
              Ver todas
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {displayedAchievements.map((achievement) => (
            <AchievementBadge
              key={achievement.achievementType}
              achievement={achievement}
              size="md"
            />
          ))}
        </div>
      </div>

      {/* Dialog para ver todas as conquistas */}
      <Dialog open={showAllDialog} onOpenChange={setShowAllDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Todas as Conquistas ({achievementsCount})
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 mt-4">
            {achievementsList.map((achievement) => (
              <AchievementBadge
                key={achievement.achievementType}
                achievement={achievement}
                size="md"
                showDetails
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
