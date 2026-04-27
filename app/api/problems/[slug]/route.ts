import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { normalizeStringArray, toYamlList } from "@/lib/content-utils";
import { getCurrentUser } from "@/lib/session";
import { assertCanEditContent, ensureOwnership, ContentPermissionError } from "@/lib/content-ownership";
import { ensureTagPaths, normalizeTagPaths, validateHierarchicalTagPaths } from "@/lib/tagManagement";

type ProblemFormat = "multiple-choice" | "short-answer";

type UpdateProblemPayload = {
  title: string;
  tagTreeTags: string[];
  tagTreePaths?: string[];
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

const PROBLEMS_DIR = path.join(process.cwd(), "data", "problems");
const WIKI_DIR = path.join(process.cwd(), "data", "wiki");
const PROBLEM_TAG_OPTIONS = ["国試", "各論", "確認", "演習"] as const;

function resolveFilePath(slug: string): string {
  const normalizedSlug = slug
    .replace(/\\/g, "/")
    .replace(/\.md$/i, "")
    .trim();
  if (!normalizedSlug || normalizedSlug.includes("..")) {
    throw new Error("不正なslugです。");
  }

  const resolveInDir = (dirPath: string) => {
    const targetPath = path.resolve(dirPath, `${normalizedSlug}.md`);
    const rootPath = path.resolve(dirPath);

    if (!targetPath.startsWith(rootPath)) {
      throw new Error("不正なslugです。");
    }

    return targetPath;
  };

  const primaryPath = resolveInDir(PROBLEMS_DIR);
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }

  const legacyPath = resolveInDir(WIKI_DIR);
  if (fs.existsSync(legacyPath)) {
    return legacyPath;
  }

  return primaryPath;
}

function validatePayload(rawPayload: unknown): UpdateProblemPayload {
  if (!rawPayload || typeof rawPayload !== "object") {
    throw new Error("Invalid request body");
  }

  const payload = rawPayload as Partial<UpdateProblemPayload>;

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const question = typeof payload.question === "string" ? payload.question.trim() : "";
  const problemTag = typeof payload.problemTag === "string" ? payload.problemTag.trim() : "";
  const candidateTagTreeTags = Array.isArray(payload.tagTreeTags)
    ? payload.tagTreeTags
    : Array.isArray(payload.tagTreePaths)
      ? payload.tagTreePaths
      : [];

  const tagTreeTags = normalizeTagPaths(normalizeStringArray(candidateTagTreeTags));

  if (!title) {
    throw new Error("タイトルは必須です。");
  }

  validateHierarchicalTagPaths(tagTreeTags);

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const { slug: encodedSlug } = await context.params;
    const slug = decodeURIComponent(encodedSlug);
    const filePath = resolveFilePath(slug);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ ok: false, message: "対象の問題が存在しません。" }, { status: 404 });
    }

    const permission = await assertCanEditContent("problem", slug, { id: user.id, role: user.role });
    const payload = validatePayload(await request.json());
    await ensureTagPaths(payload.tagTreeTags);
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

    fs.writeFileSync(filePath, `${frontmatterLines}${body}`, "utf-8");

    if (permission.canClaim) {
      await ensureOwnership("problem", slug, user.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ContentPermissionError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to update problem";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
