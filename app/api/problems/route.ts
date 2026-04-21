import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { createUniqueSlug, normalizeStringArray, slugifyTitleWithPrefix, toYamlList } from "@/lib/content-utils";
import { getAllProblems } from "@/lib/problems";
import { hasRequiredAreaFieldSelection } from "@/lib/tag-taxonomy";

const PROBLEMS_DIR = path.join(process.cwd(), "data", "problems");
const PROBLEM_TAG_OPTIONS = ["国試", "各論", "確認", "演習"] as const;

type ProblemFormat = "multiple-choice" | "short-answer";
type ProblemKind = "problem" | "wiki";

type CreateProblemPayload = {
  title: string;
  tagTreeTags: string[];
  tocTags?: string[];
  tags: string[];
  problemTag: string;
  format: ProblemFormat;
  question: string;
  choices?: string[];
  correctChoiceIndexes?: number[];
  correctChoiceIndex?: number;
  explanation?: string;
  answer?: string;
};

function normalizeCorrectChoiceIndexes(raw: unknown, fallback?: number): number[] {
  const result = new Set<number>();

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "number" && Number.isInteger(item)) {
        result.add(item);
      }
    }
  }

  if (typeof fallback === "number" && Number.isInteger(fallback)) {
    result.add(fallback);
  }

  return Array.from(result).sort((a, b) => a - b);
}

function toYamlNumberList(items: number[]): string {
  return items.map((item) => `  - ${JSON.stringify(item)}`).join("\n");
}

function validatePayload(rawPayload: unknown): CreateProblemPayload {
  if (!rawPayload || typeof rawPayload !== "object") {
    throw new Error("Invalid request body");
  }

  const payload = rawPayload as Partial<CreateProblemPayload>;

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const question = typeof payload.question === "string" ? payload.question.trim() : "";
  const problemTag = typeof payload.problemTag === "string" ? payload.problemTag.trim() : "";

  const candidateTagTreeTags = Array.isArray(payload.tagTreeTags)
    ? payload.tagTreeTags
    : payload.tocTags;

  const tagTreeTags = normalizeStringArray(candidateTagTreeTags);

  if (!title) {
    throw new Error("タイトルは必須です。");
  }

  if (!hasRequiredAreaFieldSelection(tagTreeTags)) {
    throw new Error("領域タグと分野タグの2階層選択が必須です。");
  }

  if (!problemTag || !PROBLEM_TAG_OPTIONS.includes(problemTag as (typeof PROBLEM_TAG_OPTIONS)[number])) {
    throw new Error("問題種別が不正です。");
  }

  if (!question) {
    throw new Error("問題文は必須です。");
  }

  const tags = normalizeStringArray(payload.tags);

  const format = payload.format === "short-answer" ? "short-answer" : "multiple-choice";

  let choices: string[] | undefined;
  let correctChoiceIndexes: number[] | undefined;
  let explanation: string | undefined;

  if (format === "multiple-choice") {
    const normalizedChoices = normalizeStringArray(payload.choices);

    if (normalizedChoices.length < 2 || normalizedChoices.length > 8 || normalizedChoices.some((choice) => choice.length === 0)) {
      throw new Error("選択肢は2〜8個、空欄なしで入力してください。");
    }

    const resolvedCorrectChoiceIndexes = normalizeCorrectChoiceIndexes(
      payload.correctChoiceIndexes,
      payload.correctChoiceIndex,
    );
    if (resolvedCorrectChoiceIndexes.length === 0) {
      throw new Error("正解選択肢を指定してください。");
    }
    if (resolvedCorrectChoiceIndexes.some((index) => index < 0 || index >= normalizedChoices.length)) {
      throw new Error("正解選択肢を指定してください。");
    }

    choices = normalizedChoices;
    correctChoiceIndexes = resolvedCorrectChoiceIndexes;
    explanation = typeof payload.explanation === "string" ? payload.explanation.trim() : "";
  }

  let answer: string | undefined;
  if (format === "short-answer") {
    const normalizedAnswer = typeof payload.answer === "string" ? payload.answer.trim() : "";
    if (!normalizedAnswer) {
      throw new Error("一問一答式を選択した場合、回答は必須です。");
    }
    answer = normalizedAnswer;
  }

  return {
    title,
    tagTreeTags,
    tags,
    problemTag,
    format,
    question,
    choices,
    correctChoiceIndexes,
    explanation,
    answer,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const kindParam = url.searchParams.get("kind");
    const kind: ProblemKind | undefined = kindParam === "problem" || kindParam === "wiki" ? kindParam : undefined;
    const problems = getAllProblems(kind);
    return NextResponse.json({ ok: true, problems });
  } catch (error) {
    console.error("Failed to load markdown problems:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to load problems" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = validatePayload(await request.json());
    const baseSlug = slugifyTitleWithPrefix(payload.title, "problem");
    const slug = createUniqueSlug(baseSlug, PROBLEMS_DIR);
    const storedCorrectChoiceIndexes = (payload.correctChoiceIndexes ?? []).map((index) => index + 1);

    const frontmatterLines = [
      "---",
      `title: ${JSON.stringify(payload.title)}`,
      "tags:",
      toYamlList(payload.tags),
      "toc:",
      toYamlList(payload.tagTreeTags),
      "type:",
      toYamlList([payload.problemTag]),
      `kind: ${JSON.stringify("problem")}`,
      `format: ${JSON.stringify(payload.format)}`,
      payload.format === "multiple-choice" ? "correctChoiceIndexes:" : null,
      payload.format === "multiple-choice" ? toYamlNumberList(storedCorrectChoiceIndexes) : null,
      payload.format === "short-answer" ? `answer: ${JSON.stringify(payload.answer ?? "")}` : null,
      "---",
      "",
    ]
      .filter((line): line is string => line !== null)
      .join("\n");

    const body =
      payload.format === "multiple-choice"
        ? [
            payload.question,
            "",
            "choices:",
            toYamlList(payload.choices ?? []),
            `explanation: ${JSON.stringify(payload.explanation ?? "")}`,
            "",
          ].join("\n")
        : [payload.question, ""].join("\n");

    const markdown = `${frontmatterLines}${body}`;

    fs.mkdirSync(PROBLEMS_DIR, { recursive: true });
    fs.writeFileSync(path.join(PROBLEMS_DIR, `${slug}.md`), markdown, "utf-8");

    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create problem";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
