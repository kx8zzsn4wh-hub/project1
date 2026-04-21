"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AccuracyBar } from "@/components/AccuracyBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { appendMention, CHANNELS, formatDateTime, type ChannelId, type PostItem } from "@/lib/board";
import { loadPracticePresets, type PracticePreset } from "@/lib/practice-presets";
import { createPost, fetchPosts } from "@/lib/posts-api";

export default function HomePage() {
  const [activeChannel, setActiveChannel] = useState<ChannelId>("notice");
  const [postsByChannel, setPostsByChannel] = useState<Record<ChannelId, PostItem[]>>({
    notice: [],
    chat: [],
  });
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [content, setContent] = useState("");
  const [bookmarkedPresets, setBookmarkedPresets] = useState<PracticePreset[]>([]);
  const me = useCurrentUser();

  const posts = useMemo(() => postsByChannel[activeChannel], [postsByChannel, activeChannel]);

  useEffect(() => {
    const reload = () => {
      const next = loadPracticePresets()
        .filter((preset) => preset.bookmarked)
        .slice(0, 6);
      setBookmarkedPresets(next);
    };

    reload();
    window.addEventListener("focus", reload);

    return () => {
      window.removeEventListener("focus", reload);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPosts() {
      setLoading(true);
      setError("");

      try {
        const payload = await fetchPosts({ channelId: activeChannel });

        if (!active) {
          return;
        }

        setPostsByChannel((prev) => ({
          ...prev,
          [activeChannel]: payload.posts ?? [],
        }));
      } catch (fetchError) {
        if (!active) {
          return;
        }

        const message = fetchError instanceof Error ? fetchError.message : "投稿一覧の取得に失敗しました。";
        setError(message);
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
  }, [activeChannel]);

  function insertMention(username: string) {
    setIsComposerOpen(true);
    setContent((prev) => appendMention(prev, username));
  }

  async function submitPost() {
    if (!me) {
      setError("ログイン中のみ投稿できます。");
      return;
    }

    if (!content.trim()) {
      setError("投稿内容を入力してください。");
      return;
    }

    const targetChannel = activeChannel;
    const submittedContent = content;
    const tempId = `temp-${Date.now()}`;

    const optimisticPost: PostItem = {
      id: tempId,
      content: submittedContent,
      createdAt: new Date().toISOString(),
      authorId: me.id,
      channelId: targetChannel,
      author: {
        username: me.username,
      },
    };

    setPosting(true);
    setError("");
    setPostsByChannel((prev) => ({
      ...prev,
      [targetChannel]: [optimisticPost, ...prev[targetChannel]].slice(0, 50),
    }));
    setContent("");
    setIsComposerOpen(false);

    try {
      const createdPost = await createPost({ channelId: targetChannel, content: submittedContent });

      setPostsByChannel((prev) => ({
        ...prev,
        [targetChannel]: [createdPost, ...prev[targetChannel].filter((item) => item.id !== tempId)].slice(0, 50),
      }));
    } catch (submitError) {
      setPostsByChannel((prev) => ({
        ...prev,
        [targetChannel]: prev[targetChannel].filter((item) => item.id !== tempId),
      }));
      setContent(submittedContent);
      setIsComposerOpen(true);
      const message = submitError instanceof Error ? submitError.message : "投稿に失敗しました。";
      setError(message);
    } finally {
      setPosting(false);
    }
  }

  const activeChannelLabel = CHANNELS.find((channel) => channel.id === activeChannel)?.label ?? "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        <Link className="rounded-md border bg-white px-4 py-3 text-sm font-medium hover:bg-zinc-50" href="/practice">
          問題演習
        </Link>
        <Link className="rounded-md border bg-white px-4 py-3 text-sm font-medium hover:bg-zinc-50" href="/wiki">
          Wiki
        </Link>
        <Link className="rounded-md border bg-white px-4 py-3 text-sm font-medium hover:bg-zinc-50" href="/presets">
          プリセット
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">ブックマークしたプリセット</CardTitle>
            <Link className="text-xs text-zinc-600 underline-offset-2 hover:underline" href="/presets">
              一覧で管理
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {bookmarkedPresets.length === 0 ? (
            <p className="text-sm text-zinc-600">ブックマークは未登録です。演習結果またはプリセット一覧から追加できます。</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {bookmarkedPresets.map((preset) => (
                <Link
                  key={preset.id}
                  href={`/practice/session?ids=${encodeURIComponent(preset.ids.join(","))}`}
                  className="rounded-md border border-zinc-300 bg-white p-3 text-zinc-900 transition-colors hover:bg-zinc-50"
                >
                  <p className="truncate text-sm font-semibold">{preset.name}</p>
                  <div className="mt-2">
                    <AccuracyBar correct={preset.correct} partial={preset.partial} total={preset.total} size="sm" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-lg">掲示板</CardTitle>
              <div className="flex gap-2">
                {CHANNELS.map((channel) => {
                  const active = channel.id === activeChannel;
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => setActiveChannel(channel.id)}
                      className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                        active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {channel.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link className="text-xs text-zinc-600 underline-offset-2 hover:underline" href={`/channel/${activeChannel}`}>
                チャンネル詳細へ
              </Link>
              <Button size="sm" variant="outline" onClick={() => setIsComposerOpen((prev) => !prev)} disabled={!me}>
                新規投稿
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {!me ? <p className="text-sm text-zinc-600">未ログインのため投稿はできません。閲覧のみ可能です。</p> : null}

          {isComposerOpen ? (
            <div className="rounded-md border bg-zinc-50 p-3">
              <p className="mb-2 text-sm font-medium text-zinc-800">{activeChannelLabel} に投稿</p>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
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

          {!loading && posts.length === 0 ? <p className="text-sm text-zinc-600">まだ投稿がありません。</p> : null}

          <ul className="space-y-3">
            {posts.map((post) => (
              <li key={post.id} className="rounded-md border bg-white p-3">
                <p className="whitespace-pre-wrap break-words text-sm text-zinc-900">{post.content}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                  <button
                    type="button"
                    className="font-medium text-zinc-700 underline-offset-2 hover:underline"
                    onClick={() => insertMention(post.author.username)}
                  >
                    @{post.author.username}
                  </button>
                  <span>{formatDateTime(post.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
