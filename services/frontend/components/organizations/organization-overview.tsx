"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getTeamOverview } from "@/actions/organizations";
import { getOrganizationProfile, getOrganizationProfileFresh, type OrganizationProfile } from "@/actions/social-profiles";
import type { TeamOverviewResponse } from "@/types/organization";

interface Props {
  slug: string;
  isMember?: boolean;
}

export function OrganizationOverview({ slug, isMember = false }: Props) {
  const [overview, setOverview] = useState<TeamOverviewResponse | null>(null);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const socialProfile = await getOrganizationProfile(slug);
        if (socialProfile) {
          setFollowersCount(socialProfile.followersCount);
        }

        if (isMember) {
          const data = await getTeamOverview(slug);
          setOverview(data);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    load();

    const fetchFreshProfile = async (orgSlug: string): Promise<OrganizationProfile | null> => {
      try {
        const url = `/api/social/organization-profiles/${orgSlug}?_t=${Date.now()}`;
        
        const response = await fetch(url, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });

        if (!response.ok) {
          return null;
        }

        const data = await response.json();
        
        return data?.data ?? null;
      } catch (error) {
        return null;
      }
    };

    const followHandler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail;
        if (!detail || detail.slug !== slug) {
          return;
        }
        
        fetchFreshProfile(slug).then(p => {
          if (p) {
            setFollowersCount(p.followersCount);
          } else {
          }
        }).catch(err => {
        });
      } catch (err) {
      }
    };

    const focusHandler = () => {
      fetchFreshProfile(slug).then(p => {
        if (p) setFollowersCount(p.followersCount);
      }).catch(() => {});
    };

    window.addEventListener('organization:follow-changed', followHandler as EventListener);
    window.addEventListener('focus', focusHandler);

    return () => {
      window.removeEventListener('organization:follow-changed', followHandler as EventListener);
      window.removeEventListener('focus', focusHandler);
    };
  }, [slug, isMember]);

  if (!overview && loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visão Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isMember || !overview) {
    return (
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-main" />
            Visão Geral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Seguidores</p>
              <p className="font-medium">{followersCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-main" />
          Visão Geral
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Organizadores</p>
            <p className="font-medium">{overview.total_organizers}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Membros</p>
            <p className="font-medium">{overview.total_members}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Seguidores</p>
            <p className="font-medium">{followersCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Avatar>
            <AvatarImage src={overview.owner?.avatar_url || ""} />
            <AvatarFallback>{overview.owner?.username?.substring(0,2).toUpperCase() || "?"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">Proprietário</p>
            <p className="text-sm text-muted-foreground">{overview.owner.username}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}