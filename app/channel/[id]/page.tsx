"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { appendMention, CHANNEL_LABELS, formatDateTime, type PostItem, type PostsResponse } from "@/lib/board";
import { createPost, deletePost, fetchPosts, updatePost } from "@/lib/posts-api";

export default function ChannelDetailPage() {
  const params = useParams<{ id: string }>();
  const channelId = typeof params.id === "string" ? params.id : "";

  const me = useCurrentUser();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerContent, setComposerContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const channelLabel = useMemo(
    () => (channelId === "notice" || channelId === "chat" ? CHANNEL_LABELS[channelId] : channelId),
    [channelId],
  );
  const sortedPosts = useMemo(() => {
    const copied = [...posts];
    copied.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? diff : -diff;
    });
    return copied;
  }, [posts, sortOrder]);

  useEffect(() => {
    if (!channelId) {
      return;
    }

    let active = true;

    async function loadPosts() {
      setLoading(true);
      setError("");

      try {
        const payload = (await fetchPosts({ channelId, take: 20 })) as PostsResponse;

        if (!active) {
          return;
        }

        setPosts(payload.posts ?? []);
        setNextCursor(payload.nextCursor ?? null);
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "投稿の取得に失敗しました。";
        setError(message);
        setPosts([]);
        setNextCursor(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPosts();

    return () => {
      active = false;
    };
  }, [channelId]);

  async function loadMore() {
    if (!channelId || !nextCursor) {
      return;
    }

    setLoadingMore(true);
    setError("");

    try {
      const payload = (await fetchPosts({ channelId, take: 20, cursor: nextCursor })) as PostsResponse;

      setPosts((prev) => [...prev, ...(payload.posts ?? [])]);
      setNextCursor(payload.nextCursor ?? null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "追加読み込みに失敗しました。";
      setError(message);
    } finally {
      setLoadingMore(false);
    }
  }

  function insertMention(username: string) {
    setIsComposerOpen(true);
    setComposerContent((prev) => appendMention(prev, username));
  }

  async function submitPost() {
    if (!me) {
      setError("ログイン中のみ投稿できます。");
      return;
    }

    if (!composerContent.trim()) {
      setError("投稿内容を入力してください。");
      return;
    }

    setPosting(true);
    setError("");

    try {
      const createdPost = await createPost({ channelId, content: composerContent });
      setPosts((prev) => [createdPost, ...prev]);
      setComposerContent("");
      setIsComposerOpen(false);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "投稿に失敗しました。";
      setError(message);
    } finally {
      setPosting(false);
    }
  }

  function startEdit(post: PostItem) {
    setEditingPostId(post.id);
    setEditingContent(post.content);
    setError("");
  }

  function cancelEdit() {
    setEditingPostId(null);
    setEditingContent("");
  }

  async function saveEdit(postId: string) {
    if (!editingContent.trim()) {
      setError("投稿内容を入力してください。");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const updatedPost = await updatePost(postId, editingContent);
      setPosts((prev) => prev.map((item) => (item.id === postId ? updatedPost : item)));
      cancelEdit();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "編集に失敗しました。";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function removePost(postId: string) {
    setError("");

    try {
      await deletePost(postId);

      setPosts((prev) => prev.filter((item) => item.id !== postId));
      if (editingPostId === postId) {
        cancelEdit();
      }
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : "削除に失敗しました。";
      setError(message);
    }
  }

  function canEdit(post: PostItem) {
    return me?.id === post.authorId;
  }

  function canDelete(post: PostItem) {
    if (!me) {
      return false;
    }

    return me.id === post.authorId || me.role === "admin";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">チャンネル詳細: {channelLabel}</h1>
        <Link className="text-sm text-zinc-600 underline-offset-2 hover:underline" href="/">
          トップに戻る
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">投稿一覧</CardTitle>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                  sortOrder === "desc"
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
                onClick={() => setSortOrder("desc")}
              >
                新着順
              </button>
              <button
                type="button"
                className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                  sortOrder === "asc"
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
                onClick={() => setSortOrder("asc")}
              >
                古い順
              </button>
              <Button size="sm" variant="outline" onClick={() => setIsComposerOpen((prev) => !prev)} disabled={!me}>
                新規投稿
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!me ? <p className="text-sm text-zinc-600">未ログインのため投稿はできません。閲覧のみ可能です。</p> : null}

          {isComposerOpen ? (
            <div className="rounded-md border bg-zinc-50 p-3">
              <p className="mb-2 text-sm font-medium text-zinc-800">{channelLabel} に投稿</p>
              <textarea
                value={composerContent}
                onChange={(event) => setComposerContent(event.target.value)}
                placeholder="投稿内容を入力..."
                rows={4}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-400"
              />
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={submitPost} disabled={posting || !me}>
                  {posting ? "投稿中..." : "投稿する"}
                </Button>
              </div>
            </div>
          ) : null}

          {loading ? <p className="text-sm text-zinc-600">読み込み中...</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {!loading && posts.length === 0 ? <p className="text-sm text-zinc-600">投稿がありません。</p> : null}

          <ul className="space-y-3">
            {sortedPosts.map((post) => {
              const isEditing = editingPostId === post.id;

              return (
                <li key={post.id} className="rounded-md border bg-white p-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingContent}
                        onChange={(event) => setEditingContent(event.target.value)}
                        rows={4}
                        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-400"
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                          キャンセル
                        </Button>
                        <Button size="sm" onClick={() => saveEdit(post.id)} disabled={saving}>
                          {saving ? "保存中..." : "保存"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap break-words text-sm text-zinc-900">{post.content}</p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                          <button
                            type="button"
                            className="font-medium text-zinc-700 underline-offset-2 hover:underline"
                            onClick={() => insertMention(post.author.username)}
                          >
                            @{post.author.username}
                          </button>
                          <span>{formatDateTime(post.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {canEdit(post) ? (
                            <Button size="sm" variant="outline" onClick={() => startEdit(post)}>
                              編集
                            </Button>
                          ) : null}
                          {canDelete(post) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                void removePost(post.id);
                              }}
                            >
                              削除
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>

          {nextCursor ? (
            <div className="flex justify-center pt-2">
              <Button size="sm" variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "読み込み中..." : "さらに読み込む"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
