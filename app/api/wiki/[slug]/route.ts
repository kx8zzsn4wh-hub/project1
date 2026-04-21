import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { normalizeStringArray, toYamlList } from "@/lib/content-utils";
import { getAllProblems } from "@/lib/problems";
import { hasRequiredAreaFieldSelection } from "@/lib/tag-taxonomy";
import { assertWikiUniqueness } from "@/lib/wiki-uniqueness";

type UpdateWikiPayload = {
  title: string;
  aliases?: string[];
  tagTreeTags: string[];
  tags: string[];
  content: string;
};

const WIKI_DIR = path.join(process.cwd(), "data", "wiki");
const PROBLEMS_DIR = path.join(process.cwd(), "data", "problems");

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

  const primaryPath = resolveInDir(WIKI_DIR);
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }

  const legacyPath = resolveInDir(PROBLEMS_DIR);
  if (fs.existsSync(legacyPath)) {
    return legacyPath;
  }

  return primaryPath;
}

function validatePayload(rawPayload: unknown): UpdateWikiPayload {
  if (!rawPayload || typeof rawPayload !== "object") {
    throw new Error("Invalid request body");
  }

  const payload = rawPayload as Partial<UpdateWikiPayload>;

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const content = typeof payload.content === "string" ? payload.content.trim() : "";
  const aliases = normalizeStringArray(payload.aliases);
  const tagTreeTags = normalizeStringArray(payload.tagTreeTags);
  const tags = normalizeStringArray(payload.tags);

  if (!title) {
    throw new Error("タイトルは必須です。");
  }

  if (!hasRequiredAreaFieldSelection(tagTreeTags)) {
    throw new Error("領域タグと分野タグの2階層選択が必須です。");
  }

  if (!content) {
    throw new Error("記事内容は必須です。");
  }

  return {
    title,
    aliases,
    tagTreeTags,
    tags,
    content,
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: encodedSlug } = await context.params;
    const slug = decodeURIComponent(encodedSlug);
    const filePath = resolveFilePath(slug);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ ok: false, message: "対象の記事が存在しません。" }, { status: 404 });
    }

    const payload = validatePayload(await request.json());
    const wikiArticles = getAllProblems("wiki");
    const aliases = assertWikiUniqueness({
      title: payload.title,
      aliases: payload.aliases ?? [],
      articles: wikiArticles,
      currentSlug: slug,
    });

    const frontmatter = [
      "---",
      `title: ${JSON.stringify(payload.title)}`,
      "aliases:",
      toYamlList(aliases),
      "tags:",
      toYamlList(payload.tags),
      "toc:",
      toYamlList(payload.tagTreeTags),
      "type:",
      toYamlList(["各論"]),
      `kind: ${JSON.stringify("wiki")}`,
      "---",
      "",
      payload.content,
      "",
    ].join("\n");

    fs.writeFileSync(filePath, frontmatter, "utf-8");

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update wiki article";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
