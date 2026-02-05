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
                description: "Acompanhe jogos e transmissões",
                subItems: [
                    { label: "Lista de Jogos", description: "Veja todos os jogos", href: "/jogos" },
                ]
            },
            {
                icon: <GrTrophy size={27} />,
                label: "Competições",
                description: "Acompanhe classificações e rankings",
                subItems: [
                    { label: "Todas as Competições", description: "Explore competições disponíveis", href: "/competitions" },
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
                    { label: "Explorar Organizações", description: "Lista pública de organizações", href: "/organizations" },
                    { label: "Criar Organização", description: "Iniciar nova organização", href: "/organizations/new" },
                    { label: "Convites Recebidos", description: "Gerencie seus convites", href: "/organizations/invites" },
                ]
            },
            {
                icon: <GrTrophy size={27} />,
                label: "Times",
                description: "Gerencie seus times",
                subItems: [
                    { label: "Painel de Times", description: "Visão geral dos seus times", href: "/clubes/painel" },
                    { label: "Criar Novo Time", description: "Iniciar um novo time", href: "/clubes/novo" },
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
                description: "Conecte-se com atletas e times",
                subItems: [
                    { label: "Feed Principal", description: "Publicações recentes", href: "/social" },
                    { label: "Explorar", description: "Descubra novos conteúdos", href: "/social/explore" },
                    { label: "Buscar", description: "Encontre pessoas e times", href: "/social/search" },
                    { label: "Meu Perfil", description: "Seu perfil público", href: "/profile" }
                ]
            },
            {
                icon: <BsGraphUp size={32} />,
                label: "Interações",
                description: "Acompanhe suas atividades",
                subItems: [
                    { label: "Notificações", description: "Todas as suas atualizações", href: "/notifications" },
                ]
            }
        ]
    }
};