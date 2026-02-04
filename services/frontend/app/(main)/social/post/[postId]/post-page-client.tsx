"use client";

import { PostCard } from "@/components/social/post-card";
import { Post } from "@/types/social";

interface PostPageClientProps {
  post: Post;
}

export function PostPageClient({ post }: PostPageClientProps) {
  return (
    <PostCard
      post={post}
    />
  );
}
