"use client";

import { useState } from "react";
import { ProfileSelector, ProfileContext } from "./profile-selector";
import { SearchDialog } from "./search-dialog";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, TrendingUp } from "lucide-react";
import Link from "next/link";

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
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold">Feed Social</h1>
                    <p className="text-muted-foreground mt-2">
                        Acompanhe as novidades de atletas, organizações e equipes
                    </p>
                </div>
                <div className={`flex items-center gap-2 ${canCreatePost ? 'self-start flex-wrap justify-end' : 'self-center'}`}>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setIsSearchOpen(true)}
                        title="Buscar"
                    >
                        <Search className="h-4 w-4" />
                    </Button>
                    
                    <Link href="/social/explore">
                        <Button
                            variant="outline"
                            size="icon"
                            title="Explorar"
                        >
                            <TrendingUp className="h-4 w-4" />
                        </Button>
                    </Link>
                    
                    <ProfileSelector
                        currentUser={currentUser}
                        organizations={organizations}
                        teams={teams}
                        value={selectedProfile}
                        onChange={onProfileChange}
                    />
                    {canCreatePost && (
                        <Button onClick={onCreatePost}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Criar Post
                        </Button>
                    )}
                </div>
            </div>
            
            <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </>
    );
}
