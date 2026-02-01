import { Suspense } from "react";
import { getPublicFeed } from "@/lib/api/social";
import { Skeleton } from "@/components/ui/skeleton";
import { SocialFeedClient } from "@/components/social";

export const metadata = {
    title: "Feed Social | Athlos Hub",
    description: "Acompanhe as novidades da comunidade Athlos",
};

async function SocialFeedContent() {
    const feedData = await getPublicFeed(0, 10);
    
    return (
        <SocialFeedClient initialPosts={feedData.content} hasMore={!feedData.last} />
    );
}

export default function SocialPage() {
    return (
        <div className="container">
            <Suspense fallback={<FeedSkeleton />}>
                <SocialFeedContent />
            </Suspense>
        </div>
    );
}

function FeedSkeleton() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-xl p-6 space-y-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                    <Skeleton className="h-20 w-full" />
                    <div className="flex gap-4">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-20" />
                    </div>
                </div>
            ))}
        </div>
    );
}
