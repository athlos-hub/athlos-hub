"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Loader2, Clock, Flame, ArrowLeft } from "lucide-react";
import { PostCard } from "@/components/social/post-card";
import { getTrendingPosts, getPopularPosts } from "@/actions/search";
import { Post } from "@/types/social";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { FilterPanel } from "@/components/layout/filter-panel";

export default function ExplorePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"trending" | "today" | "week">("trending");
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    loadPosts(true);
  }, [activeTab]);

  const loadPosts = async (reset: boolean = false) => {
    const currentPage = reset ? 0 : page;
    
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      let data;
      
      if (activeTab === "trending") {
        data = await getTrendingPosts(currentPage, 20);
      } else if (activeTab === "today") {
        data = await getPopularPosts(1, currentPage, 20);
      } else {
        data = await getPopularPosts(7, currentPage, 20);
      }
      
      if (reset) {
        setPosts(data.content);
      } else {
        setPosts(prev => [...prev, ...data.content]);
      }
      
      setHasMore(currentPage + 1 < data.totalPages);
      setPage(currentPage + 1);
    } catch (error) {
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Explorar"
        subtitle="Acompanhe as postagens mais populares"
      />

      <FilterPanel icon={<TrendingUp className="w-5 h-5 text-gray-600" />}>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={() => setActiveTab("trending")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "trending"
                ? "bg-main text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span className="flex items-center gap-2">
              Em Alta
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("today")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "today"
                ? "bg-main text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span className="flex items-center gap-2">
              Hoje
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("week")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "week"
                ? "bg-main text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <span className="flex items-center gap-2">
              Semana
            </span>
          </button>
        </div>
      </FilterPanel>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-muted/20 py-12 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-main" />
          <p className="text-sm text-muted-foreground mt-3">Carregando publicações…</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-40 text-main" />
          <p className="font-medium text-foreground">Nenhuma publicação popular ainda</p>
          <p className="text-sm mt-2 max-w-sm mx-auto">
            Volte mais tarde ou experimente outro período nos filtros.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={() => loadPosts()}
                disabled={isLoadingMore}
                variant="outline"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  "Carregar mais"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
