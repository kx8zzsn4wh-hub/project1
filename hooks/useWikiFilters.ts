"use client";

import { useMemo, useState } from "react";
import type { Problem } from "@/lib/problem-types";
import { useManagedTagTree } from "@/hooks/useManagedTagTree";

type WikiSortBy = "title" | "slug" | "hit" | "updatedAt";
type FilterMode = "AND" | "OR";

function matchesTagPath(problemTagPaths: string[], selectedPath: string): boolean {
  return problemTagPaths.some(
    (path) => path === selectedPath || path.startsWith(`${selectedPath}/`),
  );
}

export function useWikiFilters(problems: Problem[]) {
  const [textInput, setTextInput] = useState("");
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mode, setMode] = useState<FilterMode>("AND");
  const [sortBy, setSortBy] = useState<WikiSortBy>("title");

  const tree = useManagedTagTree();

  const matched = useMemo(
    () => {
      const normalizedQueries = searchTerms
        .map((query) => query.trim().toLowerCase())
        .filter((query) => query.length > 0);

      return problems
        .filter((problem) => {
          const hasTags = selectedTags.length > 0;
          const hasText = normalizedQueries.length > 0;

          const tagMatch = hasTags
            ? mode === "AND"
              ? selectedTags.every((tag) => matchesTagPath(problem.tagPaths, tag))
              : selectedTags.some((tag) => matchesTagPath(problem.tagPaths, tag))
            : true;

          const lowerTitle = problem.title.toLowerCase();
          const lowerAliases = (problem.aliases ?? []).map((alias) => alias.toLowerCase());
          const textMatch = hasText
            ? mode === "AND"
              ? normalizedQueries.every((query) => lowerTitle.includes(query) || lowerAliases.some((alias) => alias.includes(query)))
              : normalizedQueries.some((query) => lowerTitle.includes(query) || lowerAliases.some((alias) => alias.includes(query)))
            : true;

          if (mode === "AND") {
            return tagMatch && textMatch;
          }

          if (!hasTags && !hasText) {
            return true;
          }

          return (hasTags && tagMatch) || (hasText && textMatch);
        });
    },
    [problems, searchTerms, selectedTags, mode],
  );

  const collator = useMemo(() => new Intl.Collator("ja"), []);

  const sortedMatched = useMemo(() => {
    if (sortBy === "updatedAt") {
      return [...matched].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    }

    if (sortBy !== "hit") {
      return [...matched].sort((a, b) => collator.compare(a[sortBy], b[sortBy]));
    }

    const normalizedQueries = searchTerms
      .map((query) => query.trim().toLowerCase())
      .filter((query) => query.length > 0);

    if (normalizedQueries.length === 0) {
      return [...matched].sort((a, b) => collator.compare(a.title, b.title));
    }

    const score = (problem: Problem) => {
      const lowerTitle = problem.title.toLowerCase();
      const lowerAliases = (problem.aliases ?? []).map((alias) => alias.toLowerCase());
      let value = 0;

      for (const query of normalizedQueries) {
        if (lowerTitle.includes(query)) {
          value += 2;
        }
        if (lowerAliases.some((alias) => alias.includes(query))) {
          value += 1;
        }
      }

      return value;
    };

    return [...matched].sort((a, b) => {
      const scoreDiff = score(b) - score(a);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return collator.compare(a.title, b.title);
    });
  }, [matched, sortBy, collator, searchTerms]);

  const removeSelectedTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((item) => item !== tag));
  };

  const clearSelectedTags = () => {
    setSelectedTags([]);
  };

  const registerSearchTerm = () => {
    const nextTerm = textInput.trim();
    if (!nextTerm) {
      return;
    }

    setSearchTerms((prev) => (prev.includes(nextTerm) ? prev : [...prev, nextTerm]));
    setTextInput("");
  };

  const removeSearchTerm = (term: string) => {
    setSearchTerms((prev) => prev.filter((item) => item !== term));
  };

  const clearSearchTerms = () => {
    setSearchTerms([]);
    setTextInput("");
  };

  return {
    textInput,
    setTextInput,
    searchTerms,
    registerSearchTerm,
    removeSearchTerm,
    clearSearchTerms,
    selectedTags,
    setSelectedTags,
    removeSelectedTag,
    clearSelectedTags,
    mode,
    setMode,
    sortBy,
    setSortBy,
    tree,
    sortedMatched,
  };
}
