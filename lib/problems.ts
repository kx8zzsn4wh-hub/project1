import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Problem } from "@/lib/problem-types";
import { extractTagTermsFromPaths } from "@/lib/tag-tree";

const PROBLEMS_DIR = path.join(process.cwd(), "data", "problems");
const WIKI_DIR = path.join(process.cwd(), "data", "wiki");

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    return [value];
  }

  return [];
}

function normalizeTagPaths(values: string[]): string[] {
  const normalizeSingleTagPath = (rawPath: string) => {
    const segments = rawPath
      .split("/")
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);

    const withoutLegacyPrefix = segments[0] === "分野" ? segments.slice(1) : segments;
    return withoutLegacyPrefix.slice(0, 4).join("/");
  };

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const path = normalizeSingleTagPath(value);
    if (!path || seen.has(path)) {
      continue;
    }
    seen.add(path);
    normalized.push(path);
  }

  // Legacy fallback: old frontmatter sometimes stored segments separately (e.g. ["循環器", "心不全"]).
  if (normalized.length >= 2 && normalized.every((value) => !value.includes("/"))) {
    return [normalized.slice(0, 4).join("/")];
  }

  return normalized;
}

function normalizeFrontmatterSpacing(raw: string): string {
  const normalizedNewline = raw.replace(/\r\n/g, "\n");
  if (!normalizedNewline.startsWith("---\n")) {
    return raw;
  }

  const closingIndex = normalizedNewline.indexOf("\n---\n", 4);
  if (closingIndex < 0) {
    return raw;
  }

  const frontmatterBody = normalizedNewline.slice(4, closingIndex);
  const contentBody = normalizedNewline.slice(closingIndex + "\n---\n".length);

  const normalizedFrontmatter = frontmatterBody
    .split("\n")
    .map((line) => {
      if (line.trim().length === 0) {
        return line;
      }

      // Keep arrays/indented blocks untouched.
      if (/^\s/.test(line) || /^-\s/.test(line.trim())) {
        return line;
      }

      // Accept `key:value` and normalize to `key: value`.
      return line.replace(/^([^:#\n][^:\n]*):(\S.*)$/, "$1: $2");
    })
    .join("\n");

  return `---\n${normalizedFrontmatter}\n---\n${contentBody}`;
}

function parseMatterSafely(raw: string) {
  try {
    const parsed = matter(raw);
    const normalizedNewline = raw.replace(/\r\n/g, "\n");

    // gray-matter may silently fallback to "no frontmatter" when YAML is malformed.
    // In that case, retry once with spacing normalization for Obsidian-friendly drafts.
    if (normalizedNewline.startsWith("---\n") && Object.keys(parsed.data).length === 0) {
      const normalized = normalizeFrontmatterSpacing(raw);
      if (normalized !== raw) {
        try {
          const reparsed = matter(normalized);
          if (Object.keys(reparsed.data).length > 0) {
            return reparsed;
          }
        } catch {
          return parsed;
        }
      }
    }

    return parsed;
  } catch {
    const normalized = normalizeFrontmatterSpacing(raw);
    return matter(normalized);
  }
}

function getMarkdownFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...getMarkdownFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

type ProblemKind = Problem["kind"];

function stripOptionalQuotes(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }

  return value;
}

function parseProblemBodyMetadata(content: string): { choices: string[]; explanation?: string; question: string } {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const choicesStart = lines.findIndex((line) => line.trim() === "choices:");
  if (choicesStart < 0) {
    return { choices: [], question: content };
  }

  const questionBeforeChoices = lines.slice(0, choicesStart).join("\n");

  let cursor = choicesStart + 1;
  const choices: string[] = [];

  while (cursor < lines.length) {
    const trimmed = lines[cursor].trim();
    if (!trimmed.startsWith("- ")) {
      break;
    }

    choices.push(stripOptionalQuotes(trimmed.slice(2).trim()));
    cursor += 1;
  }

  while (cursor < lines.length && lines[cursor].trim() === "") {
    cursor += 1;
  }

  let explanation: string | undefined;
  if (cursor < lines.length && lines[cursor].trim().startsWith("explanation:")) {
    const raw = lines[cursor].trim().slice("explanation:".length).trim();
    explanation = stripOptionalQuotes(raw);
    cursor += 1;
  }

  while (cursor < lines.length && lines[cursor].trim() === "") {
    cursor += 1;
  }

  const questionAfterMetadata = lines.slice(cursor).join("\n");
  const question =
    questionBeforeChoices.trim().length > 0
      ? questionBeforeChoices
      : questionAfterMetadata;

  return {
    choices,
    explanation,
    question: question.length > 0 ? question : content,
  };
}

function normalizeCorrectChoiceIndex(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  if (value >= 1) {
    return value - 1;
  }

  if (value === 0) {
    return 0;
  }

  return undefined;
}

function normalizeCorrectChoiceIndexes(
  pluralValue: unknown,
  singularValue: unknown,
): number[] | undefined {
  const result = new Set<number>();

  if (Array.isArray(pluralValue)) {
    for (const item of pluralValue) {
      const index = normalizeCorrectChoiceIndex(item);
      if (index !== undefined) {
        result.add(index);
      }
    }
  }

  const singularIndex = normalizeCorrectChoiceIndex(singularValue);
  if (singularIndex !== undefined) {
    result.add(singularIndex);
  }

  if (result.size === 0) {
    return undefined;
  }

  return Array.from(result).sort((a, b) => a - b);
}

function detectProblemKind(slug: string, data: Record<string, unknown>, fallbackKind: ProblemKind): ProblemKind {
  const explicitKind = data.kind;
  if (explicitKind === "problem" || explicitKind === "wiki") {
    return explicitKind;
  }

  if (slug.startsWith("problem-")) {
    return "problem";
  }

  if (slug.startsWith("wiki-")) {
    return "wiki";
  }

  // Legacy fallback: treat markdown with explicit quiz-related frontmatter as problem.
  if (
    data.format !== undefined ||
    data.choices !== undefined ||
    data.correctChoiceIndex !== undefined ||
    data.correctChoiceIndexes !== undefined
  ) {
    return "problem";
  }

  return fallbackKind;
}

export function getAllProblems(kind?: ProblemKind): Problem[] {
  const sources: Array<{ dirPath: string; fallbackKind: ProblemKind }> = [
    { dirPath: PROBLEMS_DIR, fallbackKind: "problem" },
    { dirPath: WIKI_DIR, fallbackKind: "wiki" },
  ];

  const entries = sources.flatMap((source) =>
    getMarkdownFiles(source.dirPath).map((filePath) => ({ filePath, source })),
  );

  return entries
    .map(({ filePath, source }) => {
      const stat = fs.statSync(filePath);
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = parseMatterSafely(raw);
      const bodyMetadata = parseProblemBodyMetadata(parsed.content);
      const relativePath = path.relative(source.dirPath, filePath);
      const slug = relativePath.replace(/\.md$/, "").replace(/\\/g, "/");

      const title = typeof parsed.data.title === "string" ? parsed.data.title : slug;
      const detectedKind = detectProblemKind(slug, parsed.data as Record<string, unknown>, source.fallbackKind);
      const format: Problem["format"] =
        parsed.data.format === "short-answer"
          ? "short-answer"
          : parsed.data.format === "multiple-choice"
            ? "multiple-choice"
            : undefined;
      const choices = format === "multiple-choice" ? bodyMetadata.choices : [];
      const correctChoiceIndexes =
        format === "multiple-choice"
          ? normalizeCorrectChoiceIndexes(parsed.data.correctChoiceIndexes, parsed.data.correctChoiceIndex)
          : undefined;
      const correctChoiceIndex = normalizeCorrectChoiceIndex(parsed.data.correctChoiceIndex);
      const explanation = format === "multiple-choice" ? bodyMetadata.explanation : undefined;
      const answer = typeof parsed.data.answer === "string" ? parsed.data.answer : undefined;
      const tagPaths = normalizeTagPaths(toStringArray(parsed.data.toc));

      return {
        slug,
        title,
        updatedAt: stat.mtime.toISOString(),
        aliases: toStringArray(parsed.data.aliases),
        tags: toStringArray(parsed.data.tags),
        toc: extractTagTermsFromPaths(tagPaths),
        tagPaths,
        type: toStringArray(parsed.data.type),
        content: format === "multiple-choice" ? bodyMetadata.question : parsed.content,
        kind: detectedKind,
        format,
        choices,
        correctChoiceIndexes,
        correctChoiceIndex,
        explanation,
        answer,
      };
    })
    .filter((item) => (kind ? item.kind === kind : true))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
