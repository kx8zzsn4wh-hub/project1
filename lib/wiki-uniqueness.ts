import type { Problem } from "@/lib/problem-types";

type WikiUniquenessInput = {
  title: string;
  aliases: string[];
  articles: Problem[];
  currentSlug?: string;
};

function normalizeTerm(term: string): string {
  return term.trim().toLowerCase();
}

export function assertWikiUniqueness({ title, aliases, articles, currentSlug }: WikiUniquenessInput): string[] {
  const normalizedTitle = normalizeTerm(title);
  const seenAliases = new Set<string>();

  const normalizedAliases = aliases.map((alias) => alias.trim()).filter((alias) => alias.length > 0);

  for (const alias of normalizedAliases) {
    const key = normalizeTerm(alias);

    if (key === normalizedTitle) {
      throw new Error("検索ワードにタイトルと同じ語は設定できません。");
    }

    if (seenAliases.has(key)) {
      throw new Error(`検索ワード「${alias}」が重複しています。`);
    }

    seenAliases.add(key);
  }

  const reserved = new Map<string, { term: string; slug: string }>();

  for (const article of articles) {
    if (currentSlug && article.slug === currentSlug) {
      continue;
    }

    const titleKey = normalizeTerm(article.title);
    if (titleKey) {
      reserved.set(titleKey, { term: article.title, slug: article.slug });
    }

    for (const alias of article.aliases ?? []) {
      const aliasKey = normalizeTerm(alias);
      if (!aliasKey) {
        continue;
      }
      if (!reserved.has(aliasKey)) {
        reserved.set(aliasKey, { term: alias, slug: article.slug });
      }
    }
  }

  const titleCollision = reserved.get(normalizedTitle);
  if (titleCollision) {
    throw new Error(
      `タイトル「${title}」は既存の記事（${titleCollision.slug}）のタイトルまたは検索ワード「${titleCollision.term}」と重複しています。`,
    );
  }

  for (const alias of normalizedAliases) {
    const collision = reserved.get(normalizeTerm(alias));
    if (collision) {
      throw new Error(
        `検索ワード「${alias}」は既存の記事（${collision.slug}）のタイトルまたは検索ワード「${collision.term}」と重複しています。`,
      );
    }
  }

  return normalizedAliases;
}
