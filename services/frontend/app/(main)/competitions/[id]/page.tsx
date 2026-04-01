import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCompetition } from "@/actions/competitions";
import { SITE_NAME, buildPageMetadata } from "@/lib/seo/site";
import { CompetitionDetailPageInner } from "./competition-detail-inner";

interface CompetitionPageParams {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: CompetitionPageParams): Promise<Metadata> {
  const { id } = await params;
  try {
    const c = await getCompetition(id);
    const description = `Acompanhe ${c.name}: classificação, times, jogos e estatísticas na competição no ${SITE_NAME}.`;
    return buildPageMetadata({
      title: c.name,
      description,
      path: `/competitions/${id}`,
      ogImage: c.image ?? null,
    });
  } catch {
    return {
      title: "Competição",
      robots: { index: false, follow: false },
    };
  }
}

function CompetitionDetailFallback() {
  return (
    <div className="space-y-6 py-8">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

export default function CompetitionDetailPage() {
  return (
    <Suspense fallback={<CompetitionDetailFallback />}>
      <CompetitionDetailPageInner />
    </Suspense>
  );
}
