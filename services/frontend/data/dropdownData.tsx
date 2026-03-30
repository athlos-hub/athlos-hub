import { GrTrophy } from "react-icons/gr";
import { LuBox, LuTv, LuUser } from "react-icons/lu";
import { FiUsers } from "react-icons/fi";
import { DropdownData } from "@/types/components/header";

export const dropdownData: Record<string, DropdownData> = {
    esportes: {
        categoryName: "Esportes",
        mainSections: [
            {
                icon: <LuTv size={32} />,
                label: "Jogos e transmissões",
                description: "Ao vivo, agendadas e encerradas",
                subItems: [
                    {
                        label: "Agenda de jogos",
                        description: "Todas as transmissões e partidas",
                        href: "/jogos",
                    },
                    {
                        label: "Ao vivo",
                        description: "Somente transmissões em andamento",
                        href: "/jogos?status=live",
                    },
                    {
                        label: "Agendadas",
                        description: "Próximas transmissões",
                        href: "/jogos?status=scheduled",
                    },
                ],
            },
            {
                icon: <GrTrophy size={27} />,
                label: "Competições e ligas",
                description: "Campeonatos e quem os organiza",
                subItems: [
                    {
                        label: "Competições",
                        description: "Explorar campeonatos, tabelas e detalhes",
                        href: "/competitions",
                    },
                    {
                        label: "Organizações",
                        description: "Ligas, federações e clubes promotores",
                        href: "/organizations",
                    },
                ],
            },
        ],
    },
    gestao: {
        categoryName: "Gestão",
        mainSections: [
            {
                icon: <LuBox size={32} />,
                label: "Organizações",
                description: "Crie organizações e responda convites",
                subItems: [
                    {
                        label: "Suas organizações",
                        description: "Lista e acesso às organizações que você participa",
                        href: "/organizations",
                    },
                    {
                        label: "Convites recebidos",
                        description: "Convites pendentes para entrar em organizações",
                        href: "/organizations/invites",
                        requiresAuth: true,
                    },
                ],
            },
            {
                icon: <FiUsers size={32} />,
                label: "Times e clubes",
                description: "Monte elencos e acesse o painel dos times",
                subItems: [
                    {
                        label: "Painel de times",
                        description: "Visão geral dos times que você gerencia",
                        href: "/clubes/painel",
                        requiresAuth: true,
                    },
                    {
                        label: "Criar time",
                        description: "Cadastrar um novo time vinculado a competições",
                        href: "/clubes/novo",
                        requiresAuth: true,
                    },
                ],
            },
        ],
    },
    social: {
        categoryName: "Social",
        mainSections: [
            {
                icon: <FiUsers size={32} />,
                label: "Feed e descoberta",
                description: "Conteúdo da comunidade e busca",
                subItems: [
                    { label: "Feed", description: "Linha do tempo das publicações", href: "/social" },
                    { label: "Explorar", description: "Descobrir posts e perfis", href: "/social/explore" },
                    { label: "Buscar", description: "Pessoas, times e publicações", href: "/social/search" },
                ],
            },
            {
                icon: <LuUser size={32} />,
                label: "Conta",
                description: "Perfil e alertas",
                subItems: [
                    {
                        label: "Meu perfil",
                        description: "Seu perfil público de atleta",
                        href: "/profile",
                        requiresAuth: true,
                    },
                    {
                        label: "Notificações",
                        description: "Menções, convites e atualizações",
                        href: "/notifications",
                        requiresAuth: true,
                    },
                ],
            },
        ],
    },
};