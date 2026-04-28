"use client";

import Link from "next/link";
import { useMemo } from "react";
import { IndependentTagBadges } from "@/components/IndependentTagBadges";
import { ResultListSkeleton } from "@/components/ProblemPlaceholders";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProblems } from "@/hooks/useProblems";

export default function ArticlesPage() {
  const { problems, loading, error } = useProblems("wiki");

  const sortedProblems = useMemo(() => {
    const collator = new Intl.Collator("ja");
    return [...problems].sort((a, b) => collator.compare(a.title, b.title));
  }, [problems]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">記事一覧</CardTitle>
            <Badge variant="outline">{loading ? "読込中..." : `${sortedProblems.length}件`}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <ResultListSkeleton /> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {!loading && !error ? (
            sortedProblems.length > 0 ? (
              <ul className="space-y-3">
                {sortedProblems.map((problem) => (
                  <li key={problem.slug} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-zinc-900">{problem.title}</p>
                      <Link
                        href={`/wiki/${encodeURIComponent(problem.slug)}`}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
                      >
                        閲覧
                      </Link>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <IndependentTagBadges slug={problem.slug} tags={problem.tags} tagPaths={problem.tagPaths} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-600">記事がありません。</p>
            )
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
