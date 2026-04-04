"use client";

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProfileContext = {
    type: 'athlete' | 'organization' | 'team';
    id: string;
    name: string;
};

function profileTypeBadgeClass(type: ProfileContext["type"]) {
    switch (type) {
        case "athlete":
            return "border-main/40 bg-main/5 text-main";
        case "organization":
            return "border-main/50 bg-main/5 text-main";
        case "team":
            return "border-gray-200 bg-gray-50 text-gray-700";
        default:
            return "";
    }
}

function ProfileTypeBadge({ type, label }: { type: ProfileContext["type"]; label: string }) {
    return (
        <Badge
            variant="outline"
            className={cn(
                "shrink-0 mr-2 px-2 py-0 text-[11px] font-semibold leading-none h-5 flex items-center",
                profileTypeBadgeClass(type)
            )}
        >
            {label}
        </Badge>
    );
}

function profileTypeLabel(type: ProfileContext["type"]) {
    switch (type) {
        case "athlete":
            return "Atleta";
        case "organization":
            return "Organização";
        case "team":
            return "Equipe";
    }
}

interface ProfileSelectorProps {
    currentUser: {
        id: string;
        name: string;
    };
    organizations?: Array<{ slug: string; name: string }>;
    teams?: Array<{ id: string; name: string }>;
    value: ProfileContext;
    onChange: (profile: ProfileContext) => void;
}

export function ProfileSelector({ 
    currentUser, 
    organizations = [], 
    teams = [], 
    value,
    onChange 
}: ProfileSelectorProps) {
    const formatValue = (profile: ProfileContext) => `${profile.type}:${profile.id}`;
    const parseValue = (val: string): ProfileContext => {
        const [type, ...idParts] = val.split(':');
        const id = idParts.join(':');
        
        if (type === 'athlete') {
            return { type: 'athlete', id: currentUser.id, name: currentUser.name };
        } else if (type === 'organization') {
            const org = organizations.find(o => o.slug === id);
            return { type: 'organization', id, name: org?.name || id };
        } else {
            const team = teams.find(t => t.id === id);
            return { type: 'team', id, name: team?.name || id };
        }
    };

    return (
        <Select 
            value={formatValue(value)} 
            onValueChange={(val) => onChange(parseValue(val))}
        >
            <SelectTrigger
                className={cn(
                    "h-9 w-full min-w-0 rounded-xl border-gray-200 bg-card shadow-sm",
                    "px-3 text-left font-normal",
                    "[&>span]:flex [&>span]:w-full [&>span]:min-w-0 [&>span]:items-center [&>span]:gap-0 [&>span]:line-clamp-none"
                )}
            >
                <SelectValue>
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                        <Avatar className="h-7 w-7 shrink-0 rounded-md">
                            <AvatarFallback className="rounded-md text-xs">
                                {value.type === 'athlete' ? <User className="h-3.5 w-3.5" /> :
                                 value.type === 'organization' ? <Building2 className="h-3.5 w-3.5" /> :
                                 <Users className="h-3.5 w-3.5" />}
                            </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                            {value.name}
                        </span>
                        <ProfileTypeBadge type={value.type} label={profileTypeLabel(value.type)} />
                    </span>
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-gray-200 shadow-md">
                <SelectGroup>
                    <SelectLabel className="text-xs text-muted-foreground">Perfil pessoal</SelectLabel>
                    <SelectItem value={formatValue({ type: 'athlete', id: currentUser.id, name: currentUser.name })}>
                        <div className="flex items-center gap-2 py-0.5">
                            <User className="h-4 w-4 shrink-0 text-main" />
                            <span className="min-w-0 flex-1 truncate">{currentUser.name}</span>
                            <ProfileTypeBadge type="athlete" label={profileTypeLabel("athlete")} />
                        </div>
                    </SelectItem>
                </SelectGroup>

                {organizations.length > 0 && (
                    <SelectGroup>
                        <SelectLabel className="text-xs text-muted-foreground">Organizações</SelectLabel>
                        {organizations.map((org) => (
                            <SelectItem key={org.slug} value={formatValue({ type: 'organization', id: org.slug, name: org.name })}>
                                <div className="flex items-center gap-2 py-0.5">
                                    <Building2 className="h-4 w-4 shrink-0 text-main" />
                                    <span className="min-w-0 flex-1 truncate">{org.name}</span>
                                    <ProfileTypeBadge type="organization" label={profileTypeLabel("organization")} />
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                )}

                {teams.length > 0 && (
                    <SelectGroup>
                        <SelectLabel className="text-xs text-muted-foreground">Equipes</SelectLabel>
                        {teams.map((team) => (
                            <SelectItem key={team.id} value={formatValue({ type: 'team', id: team.id, name: team.name })}>
                                <div className="flex items-center gap-2 py-0.5">
                                    <Users className="h-4 w-4 shrink-0 text-main" />
                                    <span className="min-w-0 flex-1 truncate">{team.name}</span>
                                    <ProfileTypeBadge type="team" label={profileTypeLabel("team")} />
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                )}
            </SelectContent>
        </Select>
    );
}
