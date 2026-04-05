"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/social/post-card";
import { getTeamPosts } from "@/actions/social-posts";
import { Post } from "@/types/social";
import { toast } from "sonner";

interface TeamPostsSectionProps {
  teamId: string;
}

export function TeamPostsSection({ teamId }: TeamPostsSectionProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [socialUnavailable, setSocialUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalPostCount, setTotalPostCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadPosts(0);
  }, [teamId]);

  const loadPosts = async (pageNumber: number) => {
    try {
      if (pageNumber === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await getTeamPosts(teamId, pageNumber, 10);

      if (!response) {
        setSocialUnavailable(true);
        setPosts([]);
        setTotalPages(0);
        setTotalPostCount(0);
        setPage(0);
        return;
      }
      setSocialUnavailable(false);

      if (pageNumber === 0) {
        setPosts(response.content);
      } else {
        setPosts((prev) => [...prev, ...response.content]);
      }

      setTotalPages(response.totalPages);
      setTotalPostCount(response.totalElements);
      setPage(pageNumber);
    } catch {
      setSocialUnavailable(false);
      setPosts([]);
      setTotalPages(0);
      setTotalPostCount(0);
      toast.error("Erro ao carregar posts da equipe");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (page + 1 < totalPages) {
      loadPosts(page + 1);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-main" />
            Posts da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-main" />
          <p className="text-sm text-muted-foreground mt-2">Carregando posts...</p>
        </CardContent>
      </Card>
    );
  }

  if (socialUnavailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-main" />
            Posts da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>
            A área social desta equipe fica disponível após a consolidação na competição e
            sincronização com a rede social.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-main" />
            Posts da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Ainda não há posts publicados por esta equipe.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-main" />
          Posts da Equipe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onLike={async () => {}}
            onComment={async () => {}}
          />
        ))}

        {page + 1 < totalPages && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                "Carregar mais posts"
              )}
            </Button>
          </div>
        )}

        {totalPostCount > 3 && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/social/search?team=${encodeURIComponent(teamId)}`)}
            >
              Acompanhar todos os posts
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
