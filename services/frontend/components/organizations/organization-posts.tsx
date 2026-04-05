"use client";

import { useState, useEffect } from "react";
import { Post } from "@/types/social";
import { PostCard } from "@/components/social/post-card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getOrganizationPosts } from "@/actions/social-posts";
import { toast } from "sonner";

interface OrganizationPostsProps {
  organizationSlug: string;
}

export function OrganizationPosts({ organizationSlug }: OrganizationPostsProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [socialUnavailable, setSocialUnavailable] = useState(false);

  useEffect(() => {
    loadPosts(0);
  }, [organizationSlug]);

  const loadPosts = async (pageNum: number) => {
    try {
      if (pageNum === 0) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const result = await getOrganizationPosts(organizationSlug, pageNum, 10);

      if (!result) {
        setSocialUnavailable(true);
        setPosts([]);
        setTotalPages(0);
        setPage(0);
        return;
      }
      setSocialUnavailable(false);

      if (pageNum === 0) {
        setPosts(result.content);
      } else {
        setPosts((prev) => [...prev, ...result.content]);
      }

      setTotalPages(result.totalPages);
      setPage(pageNum);
    } catch {
      setSocialUnavailable(false);
      setPosts([]);
      setTotalPages(0);
      toast.error("Erro ao carregar posts da organização");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages - 1) {
      loadPosts(page + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-main" />
      </div>
    );
  }

  if (socialUnavailable) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        A área social desta organização fica disponível após a aprovação pela plataforma.
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhum post publicado ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {page < totalPages - 1 && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            variant="outline"
            size="lg"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              "Carregar mais posts"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
