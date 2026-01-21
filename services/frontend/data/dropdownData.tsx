import { IoFootballOutline } from "react-icons/io5";
import { MdOutlineSportsVolleyball } from "react-icons/md";
import { GrTrophy } from "react-icons/gr";
import { LuBox, LuTv } from "react-icons/lu";
import { FiUsers } from "react-icons/fi";
import { BsGraphUp } from "react-icons/bs";
import {DropdownData} from "@/types/components/header";

export const dropdownData: Record<string, DropdownData> = {
    esportes: {
        categoryName: "Esportes",
        mainSections: [
            {
                icon: <MdOutlineSportsVolleyball size={32} />,
                label: "Jogos",
                description: "Acompanhe jogos e resultados",
                subItems: [
                    { label: "Assistir ao Vivo", description: "Transmissões em tempo real", href: "/jogos" },
                    { label: "Criar Live", description: "Agendar uma transmissão", href: "/jogos/new" },
                    { label: "Próximos Jogos", description: "Calendário de partidas", href: "/jogos/proximos" },
                    { label: "Resultados", description: "Histórico de resultados", href: "/jogos/resultados" }
                ]
            },
            {
                icon: <GrTrophy size={27} />,
                label: "Competições",
                description: "Acompanhe classificações e rankings",
                subItems: [
                    { label: "Tabelas", description: "Classificação dos times", href: "/competicoes/tabelas" },
                    { label: "Chaveamento", description: "Estrutura das competições", href: "/competicoes/chaveamento" },
                    { label: "Artilharia", description: "Maiores goleadores", href: "/competicoes/artilharia" },
                    { label: "Regulamento", description: "Regras das competições", href: "/competicoes/regulamento" }
                ]
            }
        ]
    },
    gestao: {
        categoryName: "Gestão",
        mainSections: [
            {
                icon: <LuBox size={32} />,
                label: "Organizações",
                description: "Gerencie organizações e convites",
                subItems: [
                    { label: "Lista Pública", description: "Explorar organizações", href: "/organizations" },
                    { label: "Criar Organização", description: "Iniciar nova organização", href: "/organizations/new" },
                    { label: "Convites", description: "Convites recebidos", href: "/organizations/invites" },
                ]
            },
            {
                icon: <LuBox size={32} />,
                label: "Clubes",
                description: "Gerencie seu clube",
                subItems: [
                    { label: "Painel do Clube", description: "Visão geral", href: "/clubes/painel" },
                    { label: "Elenco", description: "Gerencie atletas", href: "/clubes/elenco" },
                    { label: "Estrutura", description: "Organização do clube", href: "/clubes/estrutura" },
                    { label: "Configurações", description: "Ajustes do clube", href: "/clubes/config" }
                ]
            },
        ]
    },
    social: {
        categoryName: "Social",
        mainSections: [
            {
                icon: <FiUsers size={32} />,
                label: "Comunidade",
                description: "Conecte-se com atletas",
                subItems: [
                    { label: "Feed", description: "Publicações recentes", href: "/comunidade/feed" },
                    { label: "Atletas", description: "Encontre atletas", href: "/comunidade/atletas" },
                    { label: "Clubes", description: "Descubra clubes", href: "/comunidade/clubes" },
                    { label: "Eventos", description: "Próximos eventos", href: "/comunidade/eventos" },
                    { label: "Perfil", description: "Seu perfil", href: "/perfil" }
                ]
            },
            {
                icon: <IoFootballOutline size={32} />,
                label: "Interações",
                description: "Engaje com a comunidade",
                subItems: [
                    { label: "Mensagens", description: "Conversas privadas", href: "/social/mensagens" },
                    { label: "Notificações", description: "Atualizações", href: "/notifications" },
                    { label: "Grupos", description: "Comunidades temáticas", href: "/social/grupos" }
                ]
            }
        ]
    }
};