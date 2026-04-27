import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { normalizeStringArray, toYamlList } from "@/lib/content-utils";
import { getAllProblems } from "@/lib/problems";
import { getCurrentUser } from "@/lib/session";
import { assertCanEditContent, ensureOwnership, ContentPermissionError } from "@/lib/content-ownership";
import { ensureTagPaths, normalizeTagPaths, validateHierarchicalTagPaths } from "@/lib/tagManagement";
import { assertWikiUniqueness } from "@/lib/wiki-uniqueness";

type UpdateWikiPayload = {
  title: string;
  aliases?: string[];
  tagTreeTags: string[];
  tagTreePaths?: string[];
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
  const candidateTagTreeTags = Array.isArray(payload.tagTreeTags)
    ? payload.tagTreeTags
    : Array.isArray(payload.tagTreePaths)
      ? payload.tagTreePaths
      : [];

  const tagTreeTags = normalizeTagPaths(normalizeStringArray(candidateTagTreeTags));
  const tags = normalizeStringArray(payload.tags);

  if (!title) {
    throw new Error("タイトルは必須です。");
  }

  validateHierarchicalTagPaths(tagTreeTags);

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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const { slug: encodedSlug } = await context.params;
    const slug = decodeURIComponent(encodedSlug);
    const filePath = resolveFilePath(slug);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ ok: false, message: "対象の記事が存在しません。" }, { status: 404 });
    }

    const permission = await assertCanEditContent("wiki", slug, { id: user.id, role: user.role });
    const payload = validatePayload(await request.json());
    await ensureTagPaths(payload.tagTreeTags);
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

    if (permission.canClaim) {
      await ensureOwnership("wiki", slug, user.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ContentPermissionError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Failed to update wiki article";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
