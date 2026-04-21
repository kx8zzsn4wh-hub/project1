"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LiveMarkdownTextarea } from "@/components/LiveMarkdownTextarea";
import { TagTree } from "@/components/TagTree";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useManagedTagTree } from "@/hooks/useManagedTagTree";
import { useProblems } from "@/hooks/useProblems";
import { hasRequiredAreaFieldSelection } from "@/lib/tag-taxonomy";

type ProblemFormat = "multiple-choice" | "short-answer";

type CreateProblemResponse = {
  ok: boolean;
  slug?: string;
  message?: string;
};

type ToastState = {
  kind: "success" | "error";
  message: string;
} | null;

const PROBLEM_TAG_OPTIONS = ["国試", "各論", "確認", "演習"] as const;

export default function PracticeNewPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [problemTag, setProblemTag] = useState<string>(PROBLEM_TAG_OPTIONS[0]);
  const [selectedTagTreeTags, setSelectedTagTreeTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [format, setFormat] = useState<ProblemFormat>("multiple-choice");
  const [choices, setChoices] = useState<string[]>(["", ""]);
  const [correctChoiceIndexes, setCorrectChoiceIndexes] = useState<number[]>([]);
  const [explanation, setExplanation] = useState("");
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const explanationRef = useRef<HTMLTextAreaElement | null>(null);
  const answerRef = useRef<HTMLTextAreaElement | null>(null);
  const { problems: wikiProblems } = useProblems("wiki");

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

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

  const updateChoice = (index: number, value: string) => {
    setChoices((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const addChoice = () => {
    setChoices((prev) => (prev.length >= 8 ? prev : [...prev, ""]));
  };

  const removeChoice = (index: number) => {
    setChoices((prev) => {
      if (prev.length <= 2) {
        return prev;
      }

      const next = prev.filter((_, idx) => idx !== index);
      return next;
    });

    setCorrectChoiceIndexes((prev) =>
      prev
        .filter((item) => item !== index)
        .map((item) => (item > index ? item - 1 : item)),
    );
  };

  const toggleCorrectChoiceIndex = (index: number, checked: boolean) => {
    setCorrectChoiceIndexes((prev) => {
      if (checked) {
        return prev.includes(index) ? prev : [...prev, index].sort((a, b) => a - b);
      }
      return prev.filter((item) => item !== index);
    });
  };

  const insertAtExplanationCursor = (prefix: string, suffix = "") => {
    const textarea = explanationRef.current;
    if (!textarea) {
      setExplanation((prev) => `${prev}${prefix}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = explanation.slice(start, end);
    const next = `${explanation.slice(0, start)}${prefix}${selected}${suffix}${explanation.slice(end)}`;
    setExplanation(next);

    requestAnimationFrame(() => {
      const cursor = start + prefix.length + selected.length + suffix.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const insertAtAnswerCursor = (prefix: string, suffix = "") => {
    const textarea = answerRef.current;
    if (!textarea) {
      setAnswer((prev) => `${prev}${prefix}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = answer.slice(start, end);
    const next = `${answer.slice(0, start)}${prefix}${selected}${suffix}${answer.slice(end)}`;
    setAnswer(next);

    requestAnimationFrame(() => {
      const cursor = start + prefix.length + selected.length + suffix.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const validate = (): string => {
    if (!title.trim()) {
      return "タイトルは必須です。";
    }

    if (!hasRequiredAreaFieldSelection(selectedTagTreeTags)) {
      return "領域タグと分野タグの2階層選択が必須です。";
    }

    if (!question.trim()) {
      return "問題文は必須です。";
    }

    if (format === "multiple-choice") {
      if (choices.length < 2 || choices.length > 8) {
        return "選択肢は2〜8個で設定してください。";
      }

      if (choices.some((choice) => choice.trim().length === 0)) {
        return "選択肢に空欄があります。";
      }

      if (correctChoiceIndexes.length === 0) {
        return "正解選択肢を選んでください。";
      }
    }

    if (format === "short-answer" && !answer.trim()) {
      return "一問一答式では回答が必須です。";
    }

    return "";
  };

  const submit = async (mode: "continue" | "back") => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setSuccess("");
      setToast({ kind: "error", message: validationError });
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          tagTreeTags: selectedTagTreeTags,
          tags,
          problemTag,
          format,
          question: question.trim(),
          choices: format === "multiple-choice" ? choices.map((choice) => choice.trim()) : undefined,
          correctChoiceIndexes: format === "multiple-choice" ? correctChoiceIndexes : undefined,
          explanation: format === "multiple-choice" ? explanation.trim() : undefined,
          answer: format === "short-answer" ? answer.trim() : undefined,
        }),
      });

      const payload = (await response.json()) as CreateProblemResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "保存に失敗しました。");
      }

      if (mode === "continue") {
        setTitle("");
        setQuestion("");
        setChoices(["", ""]);
        setCorrectChoiceIndexes([]);
        setExplanation("");
        setAnswer("");
        setSuccess(`保存しました（${payload.slug ?? "new"}）。タグツリー選択は保持されています。`);
        setToast({ kind: "success", message: "保存しました。続けて新規作成できます。" });
        return;
      }

      setToast({ kind: "success", message: "保存しました。問題演習に戻ります。" });
      router.push("/practice");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "保存に失敗しました。";
      setError(message);
      setToast({ kind: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {toast ? (
        <div className="fixed right-4 top-4 z-50">
          <div
            className={`max-w-sm rounded-md border px-4 py-3 text-sm shadow-lg ${
              toast.kind === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-red-300 bg-red-50 text-red-900"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p>{toast.message}</p>
              <button
                type="button"
                className="text-xs underline-offset-2 hover:underline"
                onClick={() => setToast(null)}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">問題の新規作成</h1>
        <Button variant="outline" onClick={() => router.push("/practice")}>検索に戻る</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium">タイトル</p>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="問題タイトル" />
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
              placeholder="例: 心不全"
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
            <p className="text-sm font-medium">問題種別（1つだけ選択）</p>
            <div className="flex flex-wrap gap-2">
              {PROBLEM_TAG_OPTIONS.map((option) => {
                const active = problemTag === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setProblemTag(option)}
                    className={`rounded-full border px-2 py-1 text-xs transition-colors ${
                      active ? "border-zinc-900 bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">問題形式</p>
            <div className="inline-flex rounded-md border p-1">
              <button
                type="button"
                onClick={() => setFormat("multiple-choice")}
                className={`rounded px-3 py-1 text-xs ${format === "multiple-choice" ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
              >
                選択肢式
              </button>
              <button
                type="button"
                onClick={() => setFormat("short-answer")}
                className={`rounded px-3 py-1 text-xs ${format === "short-answer" ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
              >
                一問一答式
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">問題内容</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">問題文</p>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="問題文を入力"
              rows={5}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-400"
            />
          </div>

          {format === "multiple-choice" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">選択肢（2〜8）</p>
                <Button type="button" variant="outline" size="sm" onClick={addChoice} disabled={choices.length >= 8}>
                  選択肢を追加
                </Button>
              </div>

              {choices.map((choice, index) => (
                <div key={`choice-${index}`} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={correctChoiceIndexes.includes(index)}
                    onChange={(event) => toggleCorrectChoiceIndex(index, event.target.checked)}
                    aria-label={`正解選択肢 ${index + 1}`}
                  />
                  <Input
                    value={choice}
                    onChange={(event) => updateChoice(index, event.target.value)}
                    placeholder={`選択肢 ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeChoice(index)}
                    disabled={choices.length <= 2}
                  >
                    削除
                  </Button>
                </div>
              ))}

              <div className="space-y-2">
                <p className="text-sm font-medium">解説</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => insertAtExplanationCursor("# ")}>
                    # 見出し
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => insertAtExplanationCursor("[[", "]] ")}>
                    [[リンク]]
                  </Button>
                </div>
                <LiveMarkdownTextarea
                  value={explanation}
                  onChange={setExplanation}
                  placeholder="選択肢式問題の解説を入力"
                  rows={6}
                  textareaRef={explanationRef}
                  resolveWikiLink={resolveWikiLink}
                />
              </div>
            </div>
          ) : null}

          {format === "short-answer" ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">回答</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => insertAtAnswerCursor("# ")}>
                  # 見出し
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => insertAtAnswerCursor("[[", "]] ")}>
                  [[リンク]]
                </Button>
              </div>
              <LiveMarkdownTextarea
                value={answer}
                onChange={setAnswer}
                placeholder="回答を入力"
                rows={6}
                textareaRef={answerRef}
                resolveWikiLink={resolveWikiLink}
              />
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button onClick={() => void submit("continue")} disabled={submitting}>
              {submitting ? "保存中..." : "保存して続ける"}
            </Button>
            <Button variant="outline" onClick={() => void submit("back")} disabled={submitting}>
              {submitting ? "保存中..." : "保存して検索に戻る"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
