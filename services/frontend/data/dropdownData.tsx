import { IoFootballOutline } from "react-icons/io5";
import { MdOutlineSportsVolleyball } from "react-icons/md";
import { GrTrophy } from "react-icons/gr";
import { LuBox } from "react-icons/lu";
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
                    { label: "Próximos Jogos", description: "Calendário de partidas", href: "/jogos/proximos" },
                    { label: "Resultados", description: "Histórico de resultados", href: "/jogos/resultados" },
                    { label: "Estatísticas", description: "Análise de desempenho", href: "/jogos/estatisticas" }
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
                label: "Clubes",
                description: "Gerencie seu clube",
                subItems: [
                    { label: "Painel do Clube", description: "Visão geral", href: "/clubes/painel" },
                    { label: "Elenco", description: "Gerencie atletas", href: "/clubes/elenco" },
                    { label: "Estrutura", description: "Organização do clube", href: "/clubes/estrutura" },
                    { label: "Configurações", description: "Ajustes do clube", href: "/clubes/config" }
                ]
            },
            {
                icon: <FiUsers size={32} />,
                label: "Atletas",
                description: "Cadastro e acompanhamento",
                subItems: [
                    { label: "Lista de Atletas", description: "Todos os atletas", href: "/atletas/lista" },
                    { label: "Cadastrar Novo", description: "Adicionar atleta", href: "/atletas/novo" },
                    { label: "Desempenho", description: "Estatísticas individuais", href: "/atletas/desempenho" },
                    { label: "Histórico", description: "Trajetória do atleta", href: "/atletas/historico" }
                ]
            },
            {
                icon: <BsGraphUp size={28} />,
                label: "Financeiro",
                description: "Controle financeiro",
                subItems: [
                    { label: "Receitas", description: "Entradas financeiras", href: "/financeiro/receitas" },
                    { label: "Despesas", description: "Saídas financeiras", href: "/financeiro/despesas" },
                    { label: "Relatórios", description: "Análise financeira", href: "/financeiro/relatorios" }
                ]
            }
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
                    { label: "Eventos", description: "Próximos eventos", href: "/comunidade/eventos" }
                ]
            },
            {
                icon: <IoFootballOutline size={32} />,
                label: "Interações",
                description: "Engaje com a comunidade",
                subItems: [
                    { label: "Mensagens", description: "Conversas privadas", href: "/social/mensagens" },
                    { label: "Notificações", description: "Atualizações", href: "/social/notificacoes" },
                    { label: "Grupos", description: "Comunidades temáticas", href: "/social/grupos" }
                ]
            }
        ]
    }
};