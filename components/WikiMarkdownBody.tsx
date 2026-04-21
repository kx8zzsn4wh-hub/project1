"use client";

import Link from "next/link";
import { Fragment } from "react";

type WikiMarkdownBodyProps = {
  content: string;
  resolveWikiLink: (keyword: string) => string | null;
};

function renderInline(text: string, resolveWikiLink: (keyword: string) => string | null) {
  const parts = text.split(/\[\[([^\]]+)\]\]/g);

  return parts.map((part, index) => {
    if (index % 2 === 0) {
      return <Fragment key={`txt-${index}`}>{part}</Fragment>;
    }

    const keyword = part.trim();
    const slug = resolveWikiLink(keyword);

    if (!keyword) {
      return <Fragment key={`link-empty-${index}`}>[[ ]]</Fragment>;
    }

    if (!slug) {
      return (
        <Link
          key={`link-miss-${index}`}
          href={`/wiki/new?title=${encodeURIComponent(keyword)}`}
          className="text-zinc-500 underline decoration-zinc-400 underline-offset-2"
        >
          [[{keyword}]]
        </Link>
      );
    }

    return (
      <Link
        key={`link-hit-${index}`}
        href={`/wiki/${encodeURIComponent(slug)}`}
        className="text-zinc-900 underline decoration-zinc-900 underline-offset-2"
      >
        {keyword}
      </Link>
    );
  });
}

export function WikiMarkdownBody({ content, resolveWikiLink }: WikiMarkdownBodyProps) {
  const normalizedContent = content
    .replace(/\r\n/g, "\n")
    // Some stored fields (e.g. problem explanation) keep escaped newlines.
    // Render them as actual line breaks for consistent reading experience.
    .replace(/\\n/g, "\n");
  const lines = normalizedContent.split("\n");

  return (
    <div className="space-y-2 text-sm text-zinc-900">
      {lines.map((line, index) => {
        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading) {
          const level = heading[1].length;
          const body = heading[2];
          const className =
            level === 1
              ? "text-2xl font-bold"
              : level === 2
                ? "text-xl font-semibold"
                : level === 3
                  ? "text-lg font-semibold"
                  : "text-base font-semibold";

          return (
            <p key={`h-${index}`} className={className}>
              {renderInline(body, resolveWikiLink)}
            </p>
          );
        }

        if (line.trim().length === 0) {
          return <div key={`br-${index}`} className="h-2" />;
        }

        return (
          <p key={`p-${index}`} className="whitespace-pre-wrap break-words leading-7">
            {renderInline(line, resolveWikiLink)}
          </p>
        );
      })}
    </div>
  );
}
