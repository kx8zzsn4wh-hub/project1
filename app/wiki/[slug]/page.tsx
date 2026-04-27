"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WikiMarkdownBody } from "@/components/WikiMarkdownBody";
import { useProblems } from "@/hooks/useProblems";

export default function WikiArticleViewPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug);
  const { problems, loading, error } = useProblems("wiki");

  const article = useMemo(
    () => problems.find((item) => item.slug === slug),
    [problems, slug],
  );

  const wikiLinkIndex = useMemo(() => {
    const map = new Map<string, string>();

    for (const item of problems) {
      map.set(item.title.trim().toLowerCase(), item.slug);
      for (const alias of item.aliases ?? []) {
        map.set(alias.trim().toLowerCase(), item.slug);
      }
    }

    return map;
  }, [problems]);

  const resolveWikiLink = (keyword: string) => {
    const normalized = keyword.trim().toLowerCase();
    return wikiLinkIndex.get(normalized) ?? null;
  };

  if (loading) {
    return <p className="text-sm text-zinc-600">記事を読み込み中...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!article) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-600">対象の記事が見つかりませんでした。</p>
        <Link
          href="/wiki"
          className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
        >
          Wiki検索に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">記事閲覧</h1>
        <div className="flex gap-2">
          <Link
            href={`/wiki/${encodeURIComponent(article.slug)}/edit`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black/85"
          >
            編集
          </Link>
          <Link
            href="/wiki"
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
          >
            戻る
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{article.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(article.aliases ?? []).length > 0 ? (
            <div className="space-y-2 rounded-md border border-zinc-300 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-600">検索ワード設定</p>
              <div className="flex flex-wrap gap-2">
                {(article.aliases ?? []).map((item) => (
                  <Badge key={`${article.slug}-alias-${item}`} variant="secondary">{item}</Badge>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {article.tagPaths.map((item) => (
              <Badge key={`${article.slug}-toc-${item}`} variant="outline">{item}</Badge>
            ))}
            {article.tags.map((item) => (
              <Badge key={`${article.slug}-tag-${item}`} variant="outline">#{item}</Badge>
            ))}
          </div>

          <div className="rounded-md border bg-zinc-50 p-4">
            <p className="text-xs text-zinc-500">本文</p>
            <div className="mt-1">
              <WikiMarkdownBody content={article.content} resolveWikiLink={resolveWikiLink} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
