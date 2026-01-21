"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getTeamOverview } from "@/actions/organizations";
import type { TeamOverviewResponse } from "@/types/organization";
import { toast } from "sonner";

interface Props {
  slug: string;
  isMember?: boolean;
}

export function OrganizationOverview({ slug, isMember = false }: Props) {
  const [overview, setOverview] = useState<TeamOverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isMember) {
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const data = await getTeamOverview(slug);
        setOverview(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
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

  if (!isMember || !overview) return null;

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-main" />
          Visão Geral
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Organizadores</p>
            <p className="font-medium">{overview.total_organizers}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Membros</p>
            <p className="font-medium">{overview.total_members}</p>
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
