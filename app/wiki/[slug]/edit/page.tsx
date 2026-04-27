"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { HierarchicalTagInput } from "@/components/HierarchicalTagInput";
import { LiveMarkdownTextarea } from "@/components/LiveMarkdownTextarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useManagedTagTree } from "@/hooks/useManagedTagTree";
import { useProblems } from "@/hooks/useProblems";
import { hasRequiredAreaFieldSelection } from "@/lib/tag-validation";
import type { Problem } from "@/lib/problem-types";

type UpdateWikiResponse = {
  ok: boolean;
  message?: string;
};

function EditWikiForm({ article }: { article: Problem }) {
  const router = useRouter();
  const tree = useManagedTagTree();
  const { problems: wikiProblems } = useProblems("wiki");

  const [title, setTitle] = useState(article.title);
  const [aliasInput, setAliasInput] = useState("");
  const [aliases, setAliases] = useState<string[]>(article.aliases ?? []);
  const [selectedTagTreeTags, setSelectedTagTreeTags] = useState<string[]>(
    article.tagPaths.length > 0 ? article.tagPaths : article.toc,
  );
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(article.tags);
  const [content, setContent] = useState(article.content);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  const wikiLinkIndex = useMemo(() => {
    const map = new Map<string, string>();

    for (const item of wikiProblems) {
      map.set(item.title.trim().toLowerCase(), item.slug);
      for (const alias of item.aliases ?? []) {
        map.set(alias.trim().toLowerCase(), item.slug);
      }
    }

    return map;
  }, [wikiProblems]);

  const resolveWikiLink = (keyword: string) => {
    const normalized = keyword.trim().toLowerCase();
    return wikiLinkIndex.get(normalized) ?? null;
  };

  const addNormalTag = () => {
    const nextTag = tagInput.trim();
    if (!nextTag) {
      return;
    }

    setTags((prev) => (prev.includes(nextTag) ? prev : [...prev, nextTag]));
    setTagInput("");
  };

  const removeNormalTag = (tag: string) => {
    setTags((prev) => prev.filter((item) => item !== tag));
  };

  const addAlias = () => {
    const nextAlias = aliasInput.trim();
    if (!nextAlias) {
      return;
    }

    setAliases((prev) => (prev.includes(nextAlias) ? prev : [...prev, nextAlias]));
    setAliasInput("");
  };

  const removeAlias = (alias: string) => {
    setAliases((prev) => prev.filter((item) => item !== alias));
  };

  const moveAlias = (index: number, direction: "up" | "down") => {
    setAliases((prev) => {
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) {
        return prev;
      }

      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const insertAtCursor = (prefix: string, suffix = "") => {
    const textarea = contentRef.current;
    if (!textarea) {
      setContent((prev) => `${prev}${prefix}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);
    const nextContent = `${content.slice(0, start)}${prefix}${selected}${suffix}${content.slice(end)}`;
    setContent(nextContent);

    requestAnimationFrame(() => {
      const cursor = start + prefix.length + selected.length + suffix.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const submit = async () => {
    if (!title.trim()) {
      setError("タイトルは必須です。");
      return;
    }

    if (!hasRequiredAreaFieldSelection(selectedTagTreeTags)) {
      setError("階層タグは2〜4階層で1つ以上選択してください。");
      return;
    }

    if (!content.trim()) {
      setError("記事内容は必須です。");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/wiki/${encodeURIComponent(article.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          aliases,
          tagTreeTags: selectedTagTreeTags,
          tags,
          content: content.trim(),
        }),
      });

      const payload = (await response.json()) as UpdateWikiResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "更新に失敗しました。");
      }

      router.push(`/wiki/${encodeURIComponent(article.slug)}`);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "更新に失敗しました。";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">記事編集</h1>
        <Link
          href={`/wiki/${encodeURIComponent(article.slug)}`}
          className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
        >
          閲覧に戻る
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">編集内容</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium">タイトル</p>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="記事タイトル" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">検索ワード設定</p>
            <div className="flex gap-2">
              <Input
                value={aliasInput}
                onChange={(event) => setAliasInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addAlias();
                  }
                }}
                placeholder="例: CHF, 心不全ガイド"
              />
              <Button type="button" variant="outline" onClick={addAlias}>追加</Button>
            </div>
            {aliases.length > 0 ? (
              <ul className="space-y-2 rounded-md border border-zinc-300 bg-zinc-50 p-2">
                {aliases.map((alias, index) => (
                  <li key={alias} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1 text-sm">
                    <span>{alias}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveAlias(index, "up")}
                        disabled={index === 0}
                        className="rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50"
                      >
                        上
                      </button>
                      <button
                        type="button"
                        onClick={() => moveAlias(index, "down")}
                        disabled={index === aliases.length - 1}
                        className="rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50"
                      >
                        下
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAlias(alias)}
                        className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                      >
                        削除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-500">未設定（タイトルとは別に検索専用ワードを追加できます）</p>
            )}
          </div>

          <HierarchicalTagInput
            tree={tree}
            selectedPaths={selectedTagTreeTags}
            onChange={setSelectedTagTreeTags}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium">通常タグ設定（Enterで追加）</p>
            <Input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addNormalTag();
                }
              }}
              placeholder="例: 循環器"
            />
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button key={tag} type="button" onClick={() => removeNormalTag(tag)}>
                    <Badge variant="outline">{tag} x</Badge>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">記事内容</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => insertAtCursor("# ")}>
                # 見出し
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => insertAtCursor("[[", "]] ")}>
                [[リンク]]
              </Button>
            </div>
            <LiveMarkdownTextarea
              value={content}
              onChange={setContent}
              placeholder="記事内容を入力"
              rows={12}
              textareaRef={contentRef}
              resolveWikiLink={resolveWikiLink}
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button onClick={() => void submit()} disabled={submitting}>
              {submitting ? "更新中..." : "更新"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WikiArticleEditPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug);
  const { problems, loading, error } = useProblems("wiki");

  const article = useMemo(
    () => problems.find((item) => item.slug === slug),
    [problems, slug],
  );

  if (loading) {
    return <p className="text-sm text-zinc-600">記事を読み込み中...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!article) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-600">編集対象の記事が見つかりませんでした。</p>
        <Link
          href="/wiki"
          className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
        >
          Wiki検索に戻る
        </Link>
      </div>
    );
  }

  return <EditWikiForm article={article} />;
}
