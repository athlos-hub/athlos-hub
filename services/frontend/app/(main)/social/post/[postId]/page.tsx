import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Metadata } from "next";

import { Skeleton } from "@/components/ui/skeleton";
import { axiosAPI } from "@/lib/api/client";
import { Post } from "@/types/social";
import { PostPageClient } from "./post-page-client";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

async function getPost(postId: string): Promise<Post | null> {
  try {
    const response = await axiosAPI<ApiResponse<Post>>({
      endpoint: `/social/posts/${postId}`,
      method: "GET",
      withAuth: false,
    });
    return response.data.data || response.data as unknown as Post;
  } catch {
    return null;
  }
}

interface PostPageProps {
  params: Promise<{ postId: string }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { postId } = await params;
  const post = await getPost(postId);
  
  if (!post) {
    return {
      title: "Post não encontrado | Athlos Hub",
    };
  }

  return {
    title: `Post | Athlos Hub`,
    description: post.content.substring(0, 160),
    openGraph: {
      title: `Post no Athlos Hub`,
      description: post.content.substring(0, 160),
      type: "article",
    },
  };
}

function PostSkeleton() {
  return (
    <div className="border rounded-xl p-6 space-y-4">
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
  );
}

async function PostContent({ postId }: { postId: string }) {
  const post = await getPost(postId);

  if (!post) {
    notFound();
  }

  return <PostPageClient post={post} />;
}

export default async function PostPage({ params }: PostPageProps) {
  const { postId } = await params;

  return (
    <div className="container">
      <Suspense fallback={<PostSkeleton />}>
        <PostContent postId={postId} />
      </Suspense>
    </div>
  );
}
