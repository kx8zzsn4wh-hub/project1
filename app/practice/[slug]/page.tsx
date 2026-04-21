"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { WikiMarkdownBody } from "@/components/WikiMarkdownBody";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProblems } from "@/hooks/useProblems";

export default function PracticeProblemViewPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug);
  const { problems, loading, error } = useProblems("problem");
  const { problems: wikiProblems } = useProblems("wiki");

  const problem = useMemo(
    () => problems.find((item) => item.slug === slug),
    [problems, slug],
  );

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

  const resolvedCorrectChoiceIndexes = useMemo(() => {
    if (!problem || problem.format !== "multiple-choice") {
      return [] as number[];
    }

    const fromPlural = (problem.correctChoiceIndexes ?? []).filter((index) => Number.isInteger(index) && index >= 0);
    if (fromPlural.length > 0) {
      return Array.from(new Set(fromPlural)).sort((a, b) => a - b);
    }

    if (typeof problem.correctChoiceIndex === "number" && Number.isInteger(problem.correctChoiceIndex) && problem.correctChoiceIndex >= 0) {
      return [problem.correctChoiceIndex];
    }

    return [];
  }, [problem]);

  if (loading) {
    return <p className="text-sm text-zinc-600">問題を読み込み中...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!problem) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-600">対象の問題が見つかりませんでした。</p>
        <Link
          href="/practice"
          className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
        >
          問題演習に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">問題閲覧</h1>
        <div className="flex gap-2">
          <Link
            href={`/practice/${encodeURIComponent(problem.slug)}/edit`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black/85"
          >
            編集
          </Link>
          <Link
            href="/practice"
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
          >
            戻る
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{problem.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {problem.type.map((item) => (
              <Badge key={`${problem.slug}-type-${item}`} variant="secondary">{item}</Badge>
            ))}
            {problem.toc.map((item) => (
              <Badge key={`${problem.slug}-toc-${item}`} variant="outline">{item}</Badge>
            ))}
            {problem.tags.map((item) => (
              <Badge key={`${problem.slug}-tag-${item}`} variant="outline">#{item}</Badge>
            ))}
          </div>

          <div className="rounded-md border bg-zinc-50 p-4">
            <p className="text-xs text-zinc-500">問題文</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">{problem.content}</p>
          </div>

          {problem.format === "multiple-choice" ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">選択肢</p>
              <ul className="space-y-1">
                {(problem.choices ?? []).map((choice, index) => (
                  <li key={`${problem.slug}-choice-${choice}`} className="rounded-md border px-3 py-2 text-sm">
                    {index + 1}. {choice}
                    {resolvedCorrectChoiceIndexes.includes(index) ? " (正解)" : ""}
                  </li>
                ))}
              </ul>
              <div className="rounded-md border p-3">
                <p className="text-xs text-zinc-500">解説</p>
                <div className="mt-1">
                  <WikiMarkdownBody content={problem.explanation ?? "解説なし"} resolveWikiLink={resolveWikiLink} />
                </div>
              </div>
            </div>
          ) : null}

          {problem.format === "short-answer" ? (
            <div className="rounded-md border p-3">
              <p className="text-xs text-zinc-500">回答</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">{problem.answer ?? "回答なし"}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
