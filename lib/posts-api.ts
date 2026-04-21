import type { PostItem, PostsResponse } from "@/lib/board";

type PostMutationResponse = {
  ok?: boolean;
  post?: PostItem;
  message?: string;
};

type PostDeleteResponse = {
  ok?: boolean;
  message?: string;
};

function toErrorMessage(caught: unknown, fallback: string) {
  return caught instanceof Error ? caught.message : fallback;
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchPosts(params: { channelId: string; take?: number; cursor?: string }) {
  const query = new URLSearchParams({ channelId: params.channelId });
  if (params.take) {
    query.set("take", String(params.take));
  }
  if (params.cursor) {
    query.set("cursor", params.cursor);
  }

  const response = await fetch(`/api/posts?${query.toString()}`, { cache: "no-store" });
  const payload = await parseJsonSafe<PostsResponse>(response);

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message ?? "投稿の取得に失敗しました。");
  }

  return payload;
}

export async function createPost(params: { channelId: string; content: string }) {
  const response = await fetch("/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const payload = await parseJsonSafe<PostMutationResponse>(response);
  if (!response.ok || !payload?.ok || !payload.post) {
    throw new Error(payload?.message ?? "投稿に失敗しました。");
  }

  return payload.post;
}

export async function updatePost(postId: string, content: string) {
  const response = await fetch(`/api/posts/${postId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });

  const payload = await parseJsonSafe<PostMutationResponse>(response);
  if (!response.ok || !payload?.ok || !payload.post) {
    throw new Error(payload?.message ?? "編集に失敗しました。");
  }

  return payload.post;
}

export async function deletePost(postId: string) {
  try {
    const response = await fetch(`/api/posts/${postId}`, {
      method: "DELETE",
    });

    const payload = await parseJsonSafe<PostDeleteResponse>(response);
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message ?? "削除に失敗しました。");
    }
  } catch (caught) {
    throw new Error(toErrorMessage(caught, "削除に失敗しました。"));
  }
}