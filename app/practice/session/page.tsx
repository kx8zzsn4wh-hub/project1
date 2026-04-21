"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { WikiMarkdownBody } from "@/components/WikiMarkdownBody";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProblems } from "@/hooks/useProblems";
import type { Problem } from "@/lib/problem-types";

type AnswerState = {
  answered: boolean;
  grade: "correct" | "partial" | "incorrect";
  selectedChoiceIndexes?: number[];
};

type Judgment = AnswerState["grade"];

const JUDGMENT_OPTIONS: Array<{ value: Judgment; label: string; activeClass: string }> = [
  { value: "correct", label: "○", activeClass: "border-emerald-400 bg-emerald-50 text-emerald-900" },
  { value: "partial", label: "△", activeClass: "border-amber-400 bg-amber-50 text-amber-900" },
  { value: "incorrect", label: "✕", activeClass: "border-rose-400 bg-rose-50 text-rose-900" },
];

function parseIds(rawIds: string | null): string[] {
  if (!rawIds) {
    return [];
  }

  return rawIds
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function resolveFormat(problem: Problem): "multiple-choice" | "short-answer" {
  return problem.format === "short-answer" ? "short-answer" : "multiple-choice";
}

function resolveCorrectChoiceIndexes(problem: Problem): number[] {
  const fromPlural = (problem.correctChoiceIndexes ?? []).filter((index) => Number.isInteger(index) && index >= 0);
  if (fromPlural.length > 0) {
    return Array.from(new Set(fromPlural)).sort((a, b) => a - b);
  }

  if (typeof problem.correctChoiceIndex === "number" && Number.isInteger(problem.correctChoiceIndex) && problem.correctChoiceIndex >= 0) {
    return [problem.correctChoiceIndex];
  }

  return [];
}

function judgeMultipleChoiceSelection(selected: number[], correct: number[]): Judgment {
  const selectedSet = new Set(selected);
  const correctSet = new Set(correct);

  if (selectedSet.size === 0 || correctSet.size === 0) {
    return "incorrect";
  }

  const hasWrongChoice = Array.from(selectedSet).some((index) => !correctSet.has(index));
  const allCorrectChosen = Array.from(correctSet).every((index) => selectedSet.has(index));
  const hasAnyCorrect = Array.from(selectedSet).some((index) => correctSet.has(index));

  if (!hasWrongChoice && allCorrectChosen) {
    return "correct";
  }

  if (hasAnyCorrect) {
    return "partial";
  }

  return "incorrect";
}

function PracticeSessionContent() {
  const searchParams = useSearchParams();
  const ids = useMemo(() => parseIds(searchParams.get("ids")), [searchParams]);
  const { problems, loading, error } = useProblems("problem");
  const { problems: wikiProblems } = useProblems("wiki");

  const sessionProblems = useMemo(() => {
    if (ids.length === 0) {
      return [];
    }

    const mapBySlug = new Map(problems.map((problem) => [problem.slug, problem]));
    return ids.map((id) => mapBySlug.get(id)).filter((item): item is Problem => Boolean(item));
  }, [ids, problems]);

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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});

  const currentProblem = sessionProblems[currentIndex];

  const answeredCount = useMemo(
    () => Object.values(answers).filter((state) => state.answered).length,
    [answers],
  );

  const correctCount = useMemo(
    () => Object.values(answers).filter((state) => state.grade === "correct").length,
    [answers],
  );

  const partialCount = useMemo(
    () => Object.values(answers).filter((state) => state.grade === "partial").length,
    [answers],
  );

  const retrySlugs = useMemo(
    () =>
      sessionProblems
        .filter((problem) => {
          const state = answers[problem.slug];
          return state?.answered && state.grade !== "correct";
        })
        .map((problem) => problem.slug),
    [answers, sessionProblems],
  );

  const isCompleted = sessionProblems.length > 0 && answeredCount >= sessionProblems.length;

  const resultsHref = isCompleted
    ? `/practice/results?ids=${encodeURIComponent(sessionProblems.map((problem) => problem.slug).join(","))}&correct=${correctCount}&partial=${partialCount}&total=${sessionProblems.length}&retry=${encodeURIComponent(retrySlugs.join(","))}`
    : "";

  const setAnswer = (slug: string, next: AnswerState) => {
    setAnswers((prev) => ({ ...prev, [slug]: next }));
  };

  const setJudgment = (slug: string, judgment: Judgment) => {
    const current = answers[slug];
    setAnswer(slug, {
      answered: true,
      grade: judgment,
      selectedChoiceIndexes: current?.selectedChoiceIndexes,
    });
  };

  const toggleSelectedChoice = (slug: string, index: number) => {
    setAnswers((prev) => {
      const current = prev[slug];
      if (current?.answered) {
        return prev;
      }

      const selected = new Set(current?.selectedChoiceIndexes ?? []);
      if (selected.has(index)) {
        selected.delete(index);
      } else {
        selected.add(index);
      }

      return {
        ...prev,
        [slug]: {
          answered: false,
          grade: current?.grade ?? "incorrect",
          selectedChoiceIndexes: Array.from(selected).sort((a, b) => a - b),
        },
      };
    });
  };

  const judgeCurrentMultipleChoice = (problem: Problem) => {
    const selected = answers[problem.slug]?.selectedChoiceIndexes ?? [];
    const correct = resolveCorrectChoiceIndexes(problem);
    const grade = judgeMultipleChoiceSelection(selected, correct);

    setAnswer(problem.slug, {
      answered: true,
      grade,
      selectedChoiceIndexes: selected,
    });
    setRevealed(true);
  };

  const goNext = () => {
    setRevealed(false);
    setCurrentIndex((prev) => Math.min(prev + 1, sessionProblems.length - 1));
  };

  const goPrev = () => {
    setRevealed(false);
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  if (loading) {
    return <p className="text-sm text-zinc-600">演習データを読み込み中...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (sessionProblems.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-600">演習対象の問題がありません。問題選択からやり直してください。</p>
        <Link
          href="/practice"
          className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
        >
          問題選択に戻る
        </Link>
      </div>
    );
  }

  const format = resolveFormat(currentProblem);
  const currentAnswer = answers[currentProblem.slug];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">演習</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline">進捗: {answeredCount}/{sessionProblems.length}</Badge>
          <Badge variant="secondary">○ {correctCount}</Badge>
          <Badge variant="outline">△ {partialCount}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">カード {currentIndex + 1} / {sessionProblems.length}</CardTitle>
            <Badge variant="outline">{format === "multiple-choice" ? "選択肢式" : "一問一答式"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-zinc-50 p-4">
            <p className="text-xs text-zinc-500">Q</p>
            <p className="mt-1 whitespace-pre-wrap text-base font-medium text-zinc-900">{currentProblem.content}</p>
          </div>

          {format === "multiple-choice" ? (
            <div className="grid gap-2">
              {(currentProblem.choices ?? []).map((choice, index) => {
                const selectedChoiceIndexes = currentAnswer?.selectedChoiceIndexes ?? [];
                const isSelected = selectedChoiceIndexes.includes(index);
                const correctChoiceIndexes = resolveCorrectChoiceIndexes(currentProblem);
                const isCorrectChoice = correctChoiceIndexes.includes(index);
                const shouldHighlight = revealed && (isSelected || isCorrectChoice);
                const baseClass = "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors";
                const colorClass = shouldHighlight
                  ? isCorrectChoice
                    ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                    : "border-red-400 bg-red-50 text-red-900"
                  : isSelected
                    ? "border-zinc-900 bg-zinc-100"
                    : "hover:bg-zinc-50";

                return (
                  <button
                    key={`${currentProblem.slug}-choice-${choice}`}
                    type="button"
                    className={`${baseClass} ${colorClass}`}
                    onClick={() => {
                      if (revealed) {
                        return;
                      }

                      toggleSelectedChoice(currentProblem.slug, index);
                    }}
                  >
                    {choice}
                  </button>
                );
              })}

              {(currentProblem.choices ?? []).length > 0 && !revealed ? (
                <Button variant="outline" onClick={() => judgeCurrentMultipleChoice(currentProblem)}>
                  回答を判定する
                </Button>
              ) : null}

              {(currentProblem.choices ?? []).length === 0 ? (
                <div className="space-y-3 rounded-md border p-3">
                  <p className="text-sm text-zinc-700">選択肢が設定されていない問題です。自己評価で進めてください。</p>
                  {!revealed ? (
                    <Button variant="outline" onClick={() => setRevealed(true)}>解答を表示する</Button>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {JUDGMENT_OPTIONS.map((option) => {
                        const active = currentAnswer?.grade === option.value;
                        return (
                          <button
                            key={`${currentProblem.slug}-judge-empty-${option.value}`}
                            type="button"
                            onClick={() => setJudgment(currentProblem.slug, option.value)}
                            className={`inline-flex h-9 min-w-12 items-center justify-center rounded-md border px-3 text-sm font-semibold transition-colors ${active ? option.activeClass : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"}`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {revealed && (currentProblem.choices ?? []).length > 0 ? (
                <div className="space-y-2 rounded-md border bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-600">解答ステータス (後から変更できます)</p>
                  <div className="flex flex-wrap gap-2">
                    {JUDGMENT_OPTIONS.map((option) => {
                      const active = currentAnswer?.grade === option.value;
                      return (
                        <button
                          key={`${currentProblem.slug}-judge-choice-${option.value}`}
                          type="button"
                          onClick={() => setJudgment(currentProblem.slug, option.value)}
                          className={`inline-flex h-9 min-w-12 items-center justify-center rounded-md border px-3 text-sm font-semibold transition-colors ${active ? option.activeClass : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"}`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3 rounded-md border p-4">
              <p className="text-sm text-zinc-700">まずは自分で回答を考えてから、解答表示を押してください。</p>
              {!revealed ? (
                <Button variant="outline" onClick={() => setRevealed(true)}>解答を表示する</Button>
              ) : (
                <>
                  <div className="rounded-md border bg-zinc-50 p-3">
                    <p className="text-xs text-zinc-500">A</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">{currentProblem.answer ?? "（解答未設定）"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {JUDGMENT_OPTIONS.map((option) => {
                      const active = currentAnswer?.grade === option.value;
                      return (
                        <button
                          key={`${currentProblem.slug}-judge-short-${option.value}`}
                          type="button"
                          onClick={() => setJudgment(currentProblem.slug, option.value)}
                          className={`inline-flex h-9 min-w-12 items-center justify-center rounded-md border px-3 text-sm font-semibold transition-colors ${active ? option.activeClass : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"}`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {revealed ? (
            <div className="rounded-md border bg-white p-3">
              <p className="text-xs text-zinc-500">解説</p>
              <div className="mt-1">
                <WikiMarkdownBody
                  content={currentProblem.explanation ?? "解説は未設定です。"}
                  resolveWikiLink={resolveWikiLink}
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <div className="flex gap-2">
              <Button variant="outline" onClick={goPrev} disabled={currentIndex === 0}>前へ</Button>
              <Button variant="outline" onClick={goNext} disabled={currentIndex >= sessionProblems.length - 1}>次へ</Button>
            </div>
            <Link
              href="/practice"
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
            >
              問題選択に戻る
            </Link>
          </div>
        </CardContent>
      </Card>

      {isCompleted ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <p className="text-sm text-zinc-700">全問題の解答が完了しました。結果画面へ進めます。</p>
            <Link
              href={resultsHref}
              className="inline-flex h-10 items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black/85"
            >
              演習結果を見る
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default function PracticeSessionPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-600">演習データを読み込み中...</p>}>
      <PracticeSessionContent />
    </Suspense>
  );
}
