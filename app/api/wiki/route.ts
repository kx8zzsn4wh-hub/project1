import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { createUniqueSlug, normalizeStringArray, slugifyTitleWithPrefix, toYamlList } from "@/lib/content-utils";
import { getAllProblems } from "@/lib/problems";
import { getCurrentUser } from "@/lib/session";
import { ensureOwnership } from "@/lib/content-ownership";
import { ensureTagPaths, normalizeTagPaths, validateHierarchicalTagPaths } from "@/lib/tagManagement";
import { assertWikiUniqueness } from "@/lib/wiki-uniqueness";

const WIKI_DIR = path.join(process.cwd(), "data", "wiki");

type CreateWikiPayload = {
  title: string;
  aliases?: string[];
  tagTreeTags: string[];
  tagTreePaths?: string[];
  tocTags?: string[];
  tags: string[];
  content: string;
};

function validatePayload(rawPayload: unknown): CreateWikiPayload {
  if (!rawPayload || typeof rawPayload !== "object") {
    throw new Error("Invalid request body");
  }

  const payload = rawPayload as Partial<CreateWikiPayload>;
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const content = typeof payload.content === "string" ? payload.content.trim() : "";

  const candidateTagTreeTags = Array.isArray(payload.tagTreeTags)
    ? payload.tagTreeTags
    : Array.isArray(payload.tagTreePaths)
      ? payload.tagTreePaths
      : payload.tocTags;

  const tagTreeTags = normalizeTagPaths(normalizeStringArray(candidateTagTreeTags));

  const aliases = normalizeStringArray(payload.aliases);
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

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = validatePayload(await request.json());
    await ensureTagPaths(payload.tagTreeTags);
    const wikiArticles = getAllProblems("wiki");
    const aliases = assertWikiUniqueness({
      title: payload.title,
      aliases: payload.aliases ?? [],
      articles: wikiArticles,
    });

    const baseSlug = slugifyTitleWithPrefix(payload.title, "wiki");
    const slug = createUniqueSlug(baseSlug, WIKI_DIR);

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

    fs.mkdirSync(WIKI_DIR, { recursive: true });
    fs.writeFileSync(path.join(WIKI_DIR, `${slug}.md`), frontmatter, "utf-8");

    await ensureOwnership("wiki", slug, user.id);

    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create wiki article";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
