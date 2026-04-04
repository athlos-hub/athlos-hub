"use client";

import { useState } from "react";
import { ProfileSelector, ProfileContext } from "./profile-selector";
import { SearchDialog } from "./search-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { PlusCircle, Search, TrendingUp } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

/** Mesmo visual do SelectTrigger do perfil (h-9, borda cinza, card). */
const headerOutlineIconClass =
    "h-9 w-9 shrink-0 rounded-xl border-gray-200 bg-card p-0 shadow-sm hover:bg-gray-50";

interface SocialHeaderProps {
    selectedProfile: ProfileContext;
    onProfileChange: (profile: ProfileContext) => void;
    onCreatePost: () => void;
    currentUser: {
        id: string;
        name: string;
    };
    organizations: Array<{ slug: string; name: string }>;
    teams: Array<{ id: string; name: string }>;
    canCreatePost: boolean;
}

export function SocialHeader({ 
    selectedProfile, 
    onProfileChange, 
    onCreatePost,
    currentUser,
    organizations,
    teams,
    canCreatePost 
}: SocialHeaderProps) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    return (
        <>
            <PageHeader
                title="Feed Social"
                subtitle="Acompanhe as novidades de atletas, organizações e equipes"
                actions={
                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 sm:w-auto">
                            <div className="flex shrink-0 items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={cn(buttonVariants({ variant: "outline" }), headerOutlineIconClass)}
                                    onClick={() => setIsSearchOpen(true)}
                                    title="Buscar publicações"
                                >
                                    <Search className="h-4 w-4 text-gray-700" />
                                </Button>
                                <Link
                                    href="/social/explore"
                                    title="Explorar publicações populares"
                                    className={cn(
                                        buttonVariants({ variant: "outline" }),
                                        headerOutlineIconClass,
                                        "inline-flex items-center justify-center"
                                    )}
                                >
                                    <TrendingUp className="h-4 w-4 text-gray-700" />
                                </Link>
                            </div>

                            <div className="min-w-0 w-full flex-1 sm:min-w-[6rem] md:min-w-[10rem] lg:min-w-[12rem]">
                                <ProfileSelector
                                    currentUser={currentUser}
                                    organizations={organizations}
                                    teams={teams}
                                    value={selectedProfile}
                                    onChange={onProfileChange}
                                />
                            </div>
                        </div>

                        {canCreatePost && (
                            <Button
                                type="button"
                                size="sm"
                                onClick={onCreatePost}
                                className="h-9 w-full shrink-0 rounded-xl bg-main px-4 hover:bg-main/90 sm:w-auto"
                            >
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Criar post
                            </Button>
                        )}
                    </div>
                }
            />
            
            <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </>
    );
}
