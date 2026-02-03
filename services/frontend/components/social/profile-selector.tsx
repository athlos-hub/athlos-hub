"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Building2, Users } from "lucide-react";

export type ProfileContext = {
    type: 'athlete' | 'organization' | 'team';
    id: string;
    name: string;
};

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
    const parseValue = (value: string): ProfileContext => {
        const [type, ...idParts] = value.split(':');
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
            <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue>
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                                {value.type === 'athlete' ? <User className="h-3 w-3" /> :
                                 value.type === 'organization' ? <Building2 className="h-3 w-3" /> :
                                 <Users className="h-3 w-3" />}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{value.name}</span>
                        <Badge variant={
                            value.type === 'athlete' ? 'default' :
                            value.type === 'organization' ? 'secondary' : 'outline'
                        } className="text-xs">
                            {value.type === 'athlete' ? 'Atleta' :
                             value.type === 'organization' ? 'Organização' : 'Equipe'}
                        </Badge>
                    </div>
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectLabel>Perfil Pessoal</SelectLabel>
                    <SelectItem value={formatValue({ type: 'athlete', id: currentUser.id, name: currentUser.name })}>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{currentUser.name}</span>
                            <Badge variant="default" className="text-xs">Atleta</Badge>
                        </div>
                    </SelectItem>
                </SelectGroup>

                {organizations.length > 0 && (
                    <SelectGroup>
                        <SelectLabel>Organizações</SelectLabel>
                        {organizations.map((org) => (
                            <SelectItem key={org.slug} value={formatValue({ type: 'organization', id: org.slug, name: org.name })}>
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    <span>{org.name}</span>
                                    <Badge variant="secondary" className="text-xs">Organização</Badge>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                )}

                {teams.length > 0 && (
                    <SelectGroup>
                        <SelectLabel>Equipes</SelectLabel>
                        {teams.map((team) => (
                            <SelectItem key={team.id} value={formatValue({ type: 'team', id: team.id, name: team.name })}>
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    <span>{team.name}</span>
                                    <Badge variant="outline" className="text-xs">Equipe</Badge>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                )}
            </SelectContent>
        </Select>
    );
}
