import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import LivesPageClient from "./lives-page-client";

function LivesPageFallback() {
  return (
    <div className="min-h-screen space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function JogosPage() {
  return (
    <Suspense fallback={<LivesPageFallback />}>
      <LivesPageClient />
    </Suspense>
  );
}
