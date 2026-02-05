import { Trophy, Award, Shield, Target, Zap, Star, Crown, Medal } from "lucide-react";

export interface Achievement {
  achievementType: string;
  displayName: string;
  description: string;
  competitionName?: string;
  competitionId?: string;
  metadata?: Record<string, any>;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
}

const achievementIcons: Record<string, any> = {
  // Jogadores
  TOP_SCORER: Target,
  CHAMPION: Crown,
  RUNNER_UP: Medal,
  UNDEFEATED: Shield,
  HAT_TRICK_WINS: Zap,
  
  // Times
  TEAM_CHAMPION: Crown,
  BEST_DEFENSE: Shield,
  POWERFUL_ATTACK: Target,
  TEAM_UNDEFEATED: Shield,
  
  // Gerais
  VETERAN: Star,
  MULTI_CHAMPION: Trophy,
};

const achievementColors: Record<string, string> = {
  CHAMPION: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  TEAM_CHAMPION: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  RUNNER_UP: "bg-gray-400/10 text-gray-600 border-gray-400/20",
  TOP_SCORER: "bg-red-500/10 text-red-600 border-red-500/20",
  BEST_DEFENSE: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  POWERFUL_ATTACK: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  UNDEFEATED: "bg-green-500/10 text-green-600 border-green-500/20",
  TEAM_UNDEFEATED: "bg-green-500/10 text-green-600 border-green-500/20",
  HAT_TRICK_WINS: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  VETERAN: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  MULTI_CHAMPION: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

const sizeClasses = {
  sm: "w-12 h-12 text-lg",
  md: "w-16 h-16 text-xl",
  lg: "w-20 h-20 text-2xl",
};

export function AchievementBadge({ 
  achievement, 
  size = "md", 
  showDetails = false 
}: AchievementBadgeProps) {
  const Icon = achievementIcons[achievement.achievementType] || Award;
  const colorClass = achievementColors[achievement.achievementType] || "bg-gray-500/10 text-gray-600 border-gray-500/20";

  if (!showDetails) {
    return (
      <div 
        className={`
          ${sizeClasses[size]}
          ${colorClass}
          border-2 rounded-lg
          flex items-center justify-center
          transition-all duration-200
          hover:scale-110 hover:shadow-lg
          cursor-pointer
          group
        `}
        title={`${achievement.displayName} - ${achievement.description}`}
      >
        <Icon className="w-1/2 h-1/2" />
      </div>
    );
  }

  return (
    <div 
      className={`
        ${colorClass}
        border-2 rounded-lg p-4
        transition-all duration-200
        hover:shadow-lg
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`${sizeClasses[size]} ${colorClass} rounded-lg flex items-center justify-center shrink-0`}>
          <Icon className="w-1/2 h-1/2" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-1">
            {achievement.displayName}
          </h4>
          <p className="text-xs opacity-80 mb-2">
            {achievement.description}
          </p>
          
          {achievement.competitionName && (
            <p className="text-xs opacity-60">
              {achievement.competitionName}
            </p>
          )}
          
          {achievement.metadata && (
            <div className="flex flex-wrap gap-2 mt-2">
              {achievement.metadata.points && (
                <span className="text-xs px-2 py-0.5 bg-white/10 rounded">
                  {achievement.metadata.points} pts
                </span>
              )}
              {achievement.metadata.wins && (
                <span className="text-xs px-2 py-0.5 bg-white/10 rounded">
                  {achievement.metadata.wins} vitórias
                </span>
              )}
              {achievement.metadata.scorePro && (
                <span className="text-xs px-2 py-0.5 bg-white/10 rounded">
                  {achievement.metadata.scorePro} gols
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
