/**
 * Destaques estáticos da home (conteúdo editorial).
 * Dados dinâmicos (jogos, feed) vêm de `getHomePageData` em `actions/home.ts`.
 */

import type {
  HomeCompetition,
  HomeFeedPost,
  HomeLiveGame,
  HomeTeam,
  HomeUpcomingGame,
} from "@/types/home-page";

export type {
  HomeCompetition,
  HomeFeedPost,
  HomeLiveGame,
  HomeTeam,
  HomeUpcomingGame,
} from "@/types/home-page";

/** Destaques da plataforma (sem números inflados — adequado ao lançamento). */
export interface HomeHighlight {
  id: string;
  title: string;
  description: string;
}

export const MOCK_HOME_HIGHLIGHTS: HomeHighlight[] = [
  {
    id: "live",
    title: "Acompanhe em tempo real",
    description: "Placar e status dos jogos quando a competição estiver no ar.",
  },
  {
    id: "manage",
    title: "Organize com clareza",
    description: "Chaves, datas e equipes em um fluxo pensado para torneios.",
  },
  {
    id: "social",
    title: "Comunidade integrada",
    description: "Posts e interação para ligar atletas, clubes e torcida.",
  },
  {
    id: "early",
    title: "Em construção com você",
    description:
      "Estamos evoluindo com as primeiras organizações — participe desde o início.",
  },
];
