"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, X } from "lucide-react";
import { PostCard } from "@/components/social/post-card";
import { searchPosts } from "@/actions/search";
import { Post } from "@/types/social";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  
  const [query, setQuery] = useState(initialQuery);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (searchQuery) {
      loadPosts(true);
    }
  }, [searchQuery]);

  const loadPosts = async (reset: boolean = false) => {
    const currentPage = reset ? 0 : page;
    
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const data = await searchPosts(searchQuery, currentPage, 20);
      
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchQuery(query.trim());
      router.push(`/social/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buscar"
        subtitle="Busque por postagens na comunidade"
      />

      <form
        onSubmit={handleSearch}
        className="rounded-2xl border border-gray-200 bg-card p-6 shadow-sm"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar publicações…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>

      {!searchQuery ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-3 opacity-40 text-main" />
          <p className="font-medium text-foreground">Digite um termo para buscar</p>
          <p className="text-sm mt-2 max-w-sm mx-auto">
            Encontre publicações por palavras-chave.
          </p>
        </div>
      ) : isLoading ? (
        <div className="rounded-xl border border-border bg-muted/20 py-12 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-main" />
          <p className="text-sm text-muted-foreground mt-3">Buscando…</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 text-center text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-3 opacity-40 text-main" />
          <p className="font-medium text-foreground">Nenhum resultado para &quot;{searchQuery}&quot;</p>
          <p className="text-sm mt-2 max-w-sm mx-auto">Tente outros termos ou uma busca mais ampla.</p>
        </div>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            Resultados para &quot;{searchQuery}&quot;
          </div>
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
