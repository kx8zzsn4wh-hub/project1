"use client";

import Link from "next/link";
import { TagTree } from "@/components/TagTree";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ResultListSkeleton, TreeSkeleton } from "@/components/ProblemPlaceholders";
import { SelectedFilterBadges } from "@/components/SelectedFilterBadges";
import { usePracticeFilters } from "@/hooks/usePracticeFilters";
import { useProblems } from "@/hooks/useProblems";

const TYPE_OPTIONS = ["国試", "各論", "確認", "演習"] as const;

export default function PracticePage() {
  const { problems, loading, error } = useProblems("problem");
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
    selectedTypes,
    setSelectedTypes,
    mode,
    setMode,
    sortBy,
    setSortBy,
    resetConditions,
    tree,
    filtered,
    selectedProblems,
    selectedSet,
    toggleProblem,
  } = usePracticeFilters(problems);

  const selectedCount = selectedProblems.length;

  const practiceSessionHref =
    selectedProblems.length > 0
      ? `/practice/session?ids=${encodeURIComponent(selectedProblems.join(","))}`
      : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">問題演習</h1>
        <div className="flex items-center gap-2">
          {loading ? <Badge variant="secondary">ローディング中</Badge> : null}
          <Link
            href="/practice/new"
            className="inline-flex h-10 items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black/85"
          >
            新規作成
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">絞り込み</CardTitle>
              <div className="flex flex-col items-end gap-2">
                <Button variant="outline" size="sm" disabled={loading} onClick={resetConditions}>
                  条件リセット
                </Button>
                <div className="inline-flex rounded-md border p-1">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setMode("AND")}
                    className={`rounded px-2 py-1 text-xs ${mode === "AND" ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
                  >
                    AND
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setMode("OR")}
                    className={`rounded px-2 py-1 text-xs ${mode === "OR" ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
                  >
                    OR
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">① 問題タグ選択</p>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map((type) => {
                  const active = selectedTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        setSelectedTypes((prev) =>
                          prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type],
                        )
                      }
                      className={`rounded-full border px-2 py-1 text-xs transition-colors ${
                        active ? "border-zinc-900 bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">② リアルタイム検索</p>
              <Input
                value={textInput}
                onChange={(event) => setTextInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    registerSearchTerm();
                  }
                }}
                placeholder="タイトル検索（Enterで検索語タグ追加）"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              {loading ? <TreeSkeleton /> : <TagTree tree={tree} selectedTags={selectedTags} onChange={setSelectedTags} />}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">⑤ 検索結果</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-md border px-1 py-1 text-xs">
                  <span className="px-1 text-zinc-600">並び順</span>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setSortBy("title")}
                    className={`rounded px-2 py-0.5 ${sortBy === "title" ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
                  >
                    五十音
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setSortBy("updatedAt")}
                    className={`rounded px-2 py-0.5 ${sortBy === "updatedAt" ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
                  >
                    更新
                  </button>
                </div>
                <Badge variant="outline">ヒット: {loading ? "..." : `${filtered.length}件`}</Badge>
                <Badge variant="secondary">選択: {selectedCount}件</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
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
            <SelectedFilterBadges
              label="選択中 type"
              items={selectedTypes}
              onRemove={(value) => setSelectedTypes((prev) => prev.filter((item) => item !== value))}
              onClear={() => setSelectedTypes([])}
              badgeVariant="secondary"
            />

            <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
              {selectedProblems.length > 0 ? (
                <Link
                  href={practiceSessionHref}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black/85"
                >
                  演習開始
                </Link>
              ) : (
                <Button disabled>演習開始</Button>
              )}
              <Button variant="outline" disabled={selectedCount === 0}>
                プリセット登録
              </Button>
              <Badge variant="outline">選択: {selectedProblems.length}件</Badge>
            </div>

            {loading ? <ResultListSkeleton /> : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            {!loading && !error ? (
              filtered.length > 0 ? (
                <ul className="space-y-2">
                  {filtered.map((problem) => {
                    const checked = selectedSet.has(problem.slug);

                    return (
                      <li key={problem.slug}>
                        <div
                          className={`w-full rounded-md border p-3 transition-colors ${
                            checked ? "border-zinc-900 bg-zinc-50" : "hover:bg-zinc-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => toggleProblem(problem.slug)}
                              className="min-w-0 text-left"
                            >
                              <p className="font-medium text-zinc-900">{problem.title}</p>
                            </button>
                            <div className="flex items-center gap-2">
                              <Badge variant={checked ? "default" : "outline"}>{checked ? "ON" : "OFF"}</Badge>
                              <Link
                                href={`/practice/${encodeURIComponent(problem.slug)}`}
                                className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
                              >
                                閲覧
                              </Link>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {problem.type.map((value) => (
                              <Badge key={`${problem.slug}-type-${value}`} variant="outline">
                                {value}
                              </Badge>
                            ))}
                            {problem.tagPaths.map((value) => (
                              <Badge key={`${problem.slug}-toc-${value}`} variant="outline">
                                {value}
                              </Badge>
                            ))}
                            {problem.tags.map((value) => (
                              <Badge key={`${problem.slug}-tag-${value}`} variant="outline">
                                #{value}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-zinc-600">一致する問題がありません。</p>
              )
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
