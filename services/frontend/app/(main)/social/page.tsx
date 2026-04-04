import type { Metadata } from "next";
import { Suspense } from "react";
import { getPublicFeed } from "@/actions/social-feed";
import { Skeleton } from "@/components/ui/skeleton";
import { SocialFeedClient } from "@/components/social";
import { buildPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Feed social",
  description:
    "Publicações, conquistas e novidades da comunidade esportiva no AthlosHub.",
  path: "/social",
});

async function SocialFeedContent() {
    const feedData = await getPublicFeed(0, 10);
    
    return (
        <SocialFeedClient initialPosts={feedData.content} hasMore={!feedData.last} />
    );
}

export default function SocialPage() {
    return (
        <Suspense fallback={<FeedSkeleton />}>
            <SocialFeedContent />
        </Suspense>
    );
}

function FeedSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-9 w-48 max-w-full" />
                <Skeleton className="h-5 w-full max-w-md" />
            </div>
            <div className="rounded-2xl border border-gray-200 bg-card p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-9 w-28 rounded-lg" />
                    <Skeleton className="h-9 w-28 rounded-lg" />
                </div>
            </div>
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="rounded-xl border border-gray-200 bg-card p-6 shadow-sm space-y-4"
                    >
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2 flex-1 min-w-0">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                        <Skeleton className="h-20 w-full rounded-lg" />
                        <div className="flex gap-4">
                            <Skeleton className="h-8 w-20 rounded-md" />
                            <Skeleton className="h-8 w-20 rounded-md" />
                            <Skeleton className="h-8 w-20 rounded-md" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
