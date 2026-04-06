/** Modelos da home (camada de apresentação). */

export interface HomeCompetition {
  id: string;
  name: string;
  modality: string;
  /** Ex.: "Semifinal", "Fase de grupos · A" */
  phaseLabel?: string;
}

export interface HomeTeam {
  id: string;
  name: string;
  shortName: string;
  crestUrl?: string;
}

export interface HomeLiveGame {
  id: string;
  competition: HomeCompetition;
  homeTeam: HomeTeam;
  awayTeam: HomeTeam;
  homeScore: number;
  awayScore: number;
  statusLabel: string;
  detailHref: string;
}

export interface HomeUpcomingGame {
  id: string;
  competition: HomeCompetition;
  homeTeam: HomeTeam;
  awayTeam: HomeTeam;
  startsAt: string;
  competitionHref: string;
}

export interface HomeFeedPost {
  id: string;
  authorName: string;
  authorAvatarUrl?: string;
  /** true = logo de organização/equipe (object-contain); false/undefined = pessoa */
  authorAvatarIsBrand?: boolean;
  authorInitials: string;
  relativeTime: string;
  body: string;
  likes: number;
  comments: number;
  href: string;
}

export interface HomePageData {
  liveGames: HomeLiveGame[];
  upcomingGames: HomeUpcomingGame[];
  feedPosts: HomeFeedPost[];
}
