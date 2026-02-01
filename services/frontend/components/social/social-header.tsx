"use client";

import { ProfileSelector, ProfileContext } from "./profile-selector";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

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
    return (
        <div className="border-b pb-4 flex items-start justify-between gap-4">
            <div className="flex-1">
                <h1 className="text-3xl font-bold">Feed Social</h1>
                <p className="text-muted-foreground mt-2">
                    Acompanhe as novidades de atletas, organizações e equipes
                </p>
            </div>
            <div className={`flex items-center gap-3 ${canCreatePost ? 'self-start flex-col items-end' : 'self-center'}`}>
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
    );
}
