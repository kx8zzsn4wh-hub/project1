"use client";

import Link from "next/link";
import { ResultListSkeleton, TreeSkeleton } from "@/components/ProblemPlaceholders";
import { SelectedFilterBadges } from "@/components/SelectedFilterBadges";
import { TagTree } from "@/components/TagTree";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useWikiFilters } from "@/hooks/useWikiFilters";
import { useProblems } from "@/hooks/useProblems";

export default function WikiPage() {
  const { problems, loading, error } = useProblems("wiki");
  const {
    textInput,
    setTextInput,
    searchTerms,
    registerSearchTerm,
    removeSearchTerm,
    clearSearchTerms,
    selectedTags,
    setSelectedTags,
    removeSelectedTag,
    clearSelectedTags,
    mode,
    setMode,
    sortBy,
    setSortBy,
    tree,
    sortedMatched,
  } = useWikiFilters(problems);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card>
        <CardContent>
          {loading ? <TreeSkeleton /> : <TagTree tree={tree} selectedTags={selectedTags} onChange={setSelectedTags} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Wiki候補</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-md border px-1 py-1 text-xs">
                <span className="px-1 text-zinc-600">並び順</span>
                <button
                  type="button"
                  className={`rounded px-2 py-0.5 ${sortBy === "title" ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
                  onClick={() => setSortBy("title")}
                >
                  五十音
                </button>
                <button
                  type="button"
                  className={`rounded px-2 py-0.5 ${sortBy === "updatedAt" ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
                  onClick={() => setSortBy("updatedAt")}
                >
                  更新
                </button>
                <button
                  type="button"
                  className={`rounded px-2 py-0.5 ${sortBy === "hit" ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
                  onClick={() => setSortBy("hit")}
                >
                  hit
                </button>
              </div>
              <Badge variant="outline">{loading ? "読込中..." : `${sortedMatched.length}件`}</Badge>
              <Link
                href="/wiki/new"
                className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
              >
                新規記事作成
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-zinc-600">選択したタグに該当するノート一覧を表示します。</p>

          <div className="mb-3 space-y-2">
            <p className="text-xs font-medium text-zinc-600">検索語入力</p>
            <Input
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  registerSearchTerm();
                }
              }}
              placeholder="タイトル/検索ワード検索（Enterで検索語タグ追加）"
              disabled={loading}
            />
          </div>

          <SelectedFilterBadges
            label="検索語"
            items={searchTerms}
            onRemove={removeSearchTerm}
            onClear={clearSearchTerms}
            badgeVariant="outline"
          />

          <SelectedFilterBadges
            label="選択中タグ"
            items={selectedTags}
            onRemove={removeSelectedTag}
            onClear={clearSelectedTags}
            badgeVariant="outline"
          />

          <div className="my-3 inline-flex rounded-md border p-1">
            <button
              type="button"
              onClick={() => setMode("AND")}
              className={`rounded px-3 py-1 text-xs ${mode === "AND" ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
            >
              AND
            </button>
            <button
              type="button"
              onClick={() => setMode("OR")}
              className={`rounded px-3 py-1 text-xs ${mode === "OR" ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
            >
              OR
            </button>
          </div>

          {loading ? <ResultListSkeleton /> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {!loading && !error ? (
            sortedMatched.length > 0 ? (
              <ul className="space-y-3">
                {sortedMatched.map((problem) => {
                  const normalizedQueries = searchTerms
                    .map((term) => term.trim().toLowerCase())
                    .filter((term) => term.length > 0);
                  const titleMatched = normalizedQueries.some((term) => problem.title.toLowerCase().includes(term));
                  const matchedAliases = (problem.aliases ?? []).filter((alias) =>
                    normalizedQueries.some((term) => alias.toLowerCase().includes(term)),
                  );

                  return (
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
                      {(problem.aliases ?? []).length > 0 ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {(problem.aliases ?? []).map((alias) => (
                            <Badge key={`${problem.slug}-alias-${alias}`} variant="secondary">
                              {alias}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      {normalizedQueries.length > 0 ? (
                        <div className="mt-2 text-xs text-zinc-600">
                          ヒット理由:
                          {titleMatched ? " タイトル一致" : ""}
                          {matchedAliases.length > 0
                            ? `${titleMatched ? " /" : ""} 検索ワード一致(${matchedAliases.join(", ")})`
                            : ""}
                          {!titleMatched && matchedAliases.length === 0 ? " なし" : ""}
                        </div>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {problem.tagPaths.map((tag) => (
                          <Badge key={`${problem.slug}-toc-${tag}`} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-zinc-600">一致するノートがありません。</p>
            )
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
