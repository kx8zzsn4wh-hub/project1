"use client";

import type { RefObject } from "react";
import { useRouter } from "next/navigation";
import { WikiMarkdownBody } from "@/components/WikiMarkdownBody";

type LiveMarkdownTextareaProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  resolveWikiLink: (keyword: string) => string | null;
};

function resolveLinkHrefByCursor(
  content: string,
  cursor: number,
  resolveWikiLink: (keyword: string) => string | null,
): string | null {
  if (cursor < 0) {
    return null;
  }

  const matches = content.matchAll(/\[\[([^\]]+)\]\]/g);
  for (const match of matches) {
    if (match.index === undefined) {
      continue;
    }

    const tokenStart = match.index;
    const tokenEnd = tokenStart + match[0].length;
    const keywordStart = tokenStart + 2;
    const keywordEnd = tokenEnd - 2;

    // Only treat the inner keyword text as clickable.
    // Clicking on surrounding brackets should keep normal edit behavior.
    if (cursor < keywordStart || cursor > keywordEnd) {
      continue;
    }

    const keyword = match[1].trim();
    if (!keyword) {
      return null;
    }

    const slug = resolveWikiLink(keyword);
    return slug
      ? `/wiki/${encodeURIComponent(slug)}`
      : `/wiki/new?title=${encodeURIComponent(keyword)}`;
  }

  return null;
}

export function LiveMarkdownTextarea({
  value,
  onChange,
  placeholder,
  rows = 8,
  textareaRef,
  resolveWikiLink,
}: LiveMarkdownTextareaProps) {
  const router = useRouter();

  return (
    <div
      className="relative w-full overflow-hidden rounded-md border border-zinc-300 bg-white"
      style={{ minHeight: `${rows * 1.75}rem` }}
    >
      <div className="pointer-events-none px-3 py-2 leading-7">
        {value.trim().length > 0 ? (
          <WikiMarkdownBody content={value} resolveWikiLink={resolveWikiLink} />
        ) : (
          <p className="whitespace-pre-wrap text-sm text-zinc-500">{placeholder ?? ""}</p>
        )}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClick={(event) => {
          // Avoid accidental navigation while text is selected.
          if ((event.currentTarget.selectionStart ?? 0) !== (event.currentTarget.selectionEnd ?? 0)) {
            return;
          }

          const href = resolveLinkHrefByCursor(
            value,
            event.currentTarget.selectionStart ?? -1,
            resolveWikiLink,
          );

          if (href) {
            router.push(href);
          }
        }}
        rows={rows}
        placeholder={placeholder}
        title="[[リンク]] をクリックすると遷移します"
        className="absolute inset-0 w-full resize-y bg-transparent px-3 py-2 text-sm leading-7 text-transparent caret-zinc-900 outline-none placeholder:text-transparent selection:bg-zinc-200/70"
      />
    </div>
  );
}
