"use client";

import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { HomeFeedPost } from "@/types/home-page";
import { cn } from "@/lib/utils";

function PostCard({ post }: { post: HomeFeedPost }) {
  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <Avatar className="size-10 border border-border">
            {post.authorAvatarUrl ? (
              <AvatarImage src={post.authorAvatarUrl} alt="" />
            ) : null}
            <AvatarFallback className="text-xs font-semibold">
              {post.authorInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{post.authorName}</p>
            <p className="text-xs text-muted-foreground">{post.relativeTime}</p>
          </div>
        </div>
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {post.body}
        </p>
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Heart className="size-4" aria-hidden />
            {post.likes}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle className="size-4" aria-hidden />
            {post.comments}
          </span>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Link
          href={post.href}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "px-0 text-main"
          )}
        >
          Ver post
        </Link>
      </CardFooter>
    </Card>
  );
}

export interface SocialFeedSectionProps {
  isAuthenticated: boolean;
  initialPosts: HomeFeedPost[];
}

export function SocialFeedSection({
  isAuthenticated,
  initialPosts,
}: SocialFeedSectionProps) {
  const posts = initialPosts;

  return (
    <section
      className="border-b border-border bg-muted/20 py-16"
      aria-labelledby="home-social-heading"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="home-social-heading"
              className="text-3xl font-bold tracking-tight text-foreground"
            >
              O que está acontecendo
            </h2>
            <p className="mt-1 text-muted-foreground">
              Destaques recentes da comunidade
            </p>
          </div>
          <Link
            href="/social"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Ver mais no feed
          </Link>
        </div>

        <div
          className={cn(
            "grid grid-cols-1 gap-6",
            isAuthenticated ? "lg:grid-cols-3" : "lg:grid-cols-4"
          )}
        >
          {!isAuthenticated ? (
            <Card className="border-main/30 bg-gradient-to-br from-main/10 to-card">
              <CardContent className="flex flex-col justify-center space-y-4 pt-8 pb-4">
                <h3 className="text-xl font-semibold text-foreground">
                  Junte-se à comunidade
                </h3>
                <p className="text-sm text-muted-foreground">
                  Publique, comente e acompanhe atletas e competições em um só
                  lugar.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    href="/auth/cadastro"
                    className={cn(
                      buttonVariants(),
                      "bg-main text-white hover:bg-main/90"
                    )}
                  >
                    Criar conta
                  </Link>
                  <Link
                    href="/auth/login"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    Entrar
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {posts.length === 0 ? (
            <Card
              className={cn(
                "border-dashed p-8 text-center text-muted-foreground",
                isAuthenticated ? "lg:col-span-3" : "lg:col-span-3"
              )}
            >
              Nenhum post para exibir.{" "}
              <Link href="/social" className="font-medium text-main hover:underline">
                Explorar o feed
              </Link>
            </Card>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>
    </section>
  );
}
