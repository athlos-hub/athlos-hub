import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CompetitionDetailPageInner } from "./competition-detail-inner";

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
