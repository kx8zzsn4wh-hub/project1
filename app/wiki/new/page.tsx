"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LiveMarkdownTextarea } from "@/components/LiveMarkdownTextarea";
import { TagTree } from "@/components/TagTree";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useManagedTagTree } from "@/hooks/useManagedTagTree";
import { useProblems } from "@/hooks/useProblems";
import { hasRequiredAreaFieldSelection } from "@/lib/tag-taxonomy";

type CreateWikiResponse = {
  ok: boolean;
  slug?: string;
  message?: string;
};

function WikiNewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTitle = searchParams.get("title")?.trim() ?? "";

  const [title, setTitle] = useState(initialTitle);
  const [aliasInput, setAliasInput] = useState("");
  const [aliases, setAliases] = useState<string[]>([]);
  const [selectedTagTreeTags, setSelectedTagTreeTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const { problems: wikiProblems } = useProblems("wiki");

  const tree = useManagedTagTree();

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
      setError("領域タグと分野タグの2階層選択が必須です。");
      return;
    }

    if (!content.trim()) {
      setError("記事内容は必須です。");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/wiki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          aliases,
          tagTreeTags: selectedTagTreeTags,
          tags,
          content: content.trim(),
        }),
      });

      const payload = (await response.json()) as CreateWikiResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "保存に失敗しました。");
      }

      router.push("/wiki");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "保存に失敗しました。";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">新規記事作成</h1>
        <Button variant="outline" onClick={() => router.push("/wiki")}>Wiki検索に戻る</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">記事設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium">タイトル設定</p>
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

          <div className="space-y-2">
            <TagTree tree={tree} selectedTags={selectedTagTreeTags} onChange={setSelectedTagTreeTags} />
            {selectedTagTreeTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedTagTreeTags.map((tag) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            ) : null}
          </div>

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
            <p className="text-sm font-medium">記事内容の記入欄</p>
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
          <div className="border-t pt-4">
            <Button onClick={() => void submit()} disabled={submitting}>
              {submitting ? "保存中..." : "保存"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WikiNewPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-600">新規記事画面を読み込み中...</p>}>
      <WikiNewPageContent />
    </Suspense>
  );
}
