"use client"

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { RiHome5Line } from "react-icons/ri";
import { MdOutlineSportsBaseball } from "react-icons/md";
import { LuBox, LuTv } from "react-icons/lu";
import { FiUsers } from "react-icons/fi";
import { FaChevronDown } from "react-icons/fa6";
import { dropdownData } from '@/data/dropdownData';
import DropdownNavbar from "@/components/layout/player/dropdown-navbar";
import {Session} from "next-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {IoMdNotificationsOutline} from "react-icons/io";
import {LogoutButton} from "@/components/layout/player/logout-button";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type DropdownType = 'esportes' | 'gestao' | 'social' | null;

interface PlayerHeaderProps {
    session: Session | null;
}

export default function PlayerHeader({ session }: PlayerHeaderProps) {
    const [activeDropdown, setActiveDropdown] = useState<DropdownType>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = (dropdown: DropdownType) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setActiveDropdown(dropdown);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setActiveDropdown(null);
        }, 500);
    };

    return (
        <div className="w-full fixed top-0 left-0 z-50 bg-white shadow-md">
            <div className="w-full flex items-center justify-between py-4 bg-white">
                <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                    <Image
                        src="/logo.svg"
                        alt="Logo Oficial do AthlosHub"
                        width={180}
                        height={46}
                        priority
                    />
                    <nav className="flex items-center gap-1">
                        <Link
                            href="/"
                            className="hover:bg-[#1F78FF10] py-2.5 px-4 flex items-center gap-3 text-main transition-colors rounded-xl duration-300"
                        >
                            <RiHome5Line size={20} />
                            Início
                        </Link>

                        <div
                            className={`${activeDropdown === "esportes" ? "bg-[#1F78FF10]" : "hover:bg-[#1F78FF10]"} py-2.5 px-4 flex items-center gap-3 text-main transition-colors rounded-xl duration-300 cursor-pointer`}
                            onMouseEnter={() => handleMouseEnter('esportes')}
                            onMouseLeave={handleMouseLeave}
                        >
                            <MdOutlineSportsBaseball size={20} />
                            <span>Esportes</span>
                            <FaChevronDown className={`transition-transform duration-200 ${activeDropdown === 'esportes' ? 'rotate-180' : ''}`} />
                        </div>

                        <div
                            className={`${activeDropdown === "gestao" ? "bg-[#1F78FF10]" : "hover:bg-[#1F78FF10]"} py-2.5 px-4 flex items-center gap-3 text-main transition-colors rounded-xl duration-300 cursor-pointer`}
                            onMouseEnter={() => handleMouseEnter('gestao')}
                            onMouseLeave={handleMouseLeave}
                        >
                            <LuBox size={20} />
                            <span>Gestão</span>
                            <FaChevronDown className={`transition-transform duration-200 ${activeDropdown === 'gestao' ? 'rotate-180' : ''}`} />
                        </div>

                        <div
                            className={`${activeDropdown === "social" ? "bg-[#1F78FF10]" : "hover:bg-[#1F78FF10]"} py-2.5 px-4 flex items-center gap-3 text-main transition-colors rounded-xl duration-300 cursor-pointer`}
                            onMouseEnter={() => handleMouseEnter('social')}
                            onMouseLeave={handleMouseLeave}
                        >
                            <FiUsers size={20} />
                            <span>Social</span>
                            <FaChevronDown className={`transition-transform duration-200 ${activeDropdown === 'social' ? 'rotate-180' : ''}`} />
                        </div>
                    </nav>

                    {session ? (
                        <div className="flex items-center gap-6">
                            <IoMdNotificationsOutline size={20} className="cursor-pointer" />
                            <DropdownMenu>
                                <DropdownMenuTrigger className="focus:outline-none" asChild={true}>
                                    <Avatar className="cursor-pointer">
                                        <AvatarImage
                                            src={session?.user?.image ?? undefined}
                                            alt={session?.user?.name ?? "Avatar"}
                                            referrerPolicy="no-referrer"
                                        />
                                        <AvatarFallback>
                                            {session.user?.name?.slice(0, 2).toUpperCase() ?? "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent>
                                    <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/perfil" className="cursor-pointer">
                                            Meu Perfil
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="p-0">
                                        <LogoutButton />
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : (
                        <Link href="/auth/login" className="text-main cursor-pointer px-6 py-2 hover:bg-[#1F78FF10] rounded-xl transition-colors duration-300">
                            Entrar
                        </Link>
                    )}
                </div>
            </div>

            {activeDropdown && (
                <div
                    onMouseEnter={() => {
                        if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                        }
                    }}
                    onMouseLeave={handleMouseLeave}
                >
                    <DropdownNavbar
                        categoryName={dropdownData[activeDropdown].categoryName}
                        mainSections={dropdownData[activeDropdown].mainSections}
                        isOpen={true}
                    />
                </div>
            )}
        </div>
    );
}