"use client";

import { useMemo, useState } from "react";
import type { Problem } from "@/lib/problem-types";
import { filterProblems, type FilterMode } from "@/lib/problem-search";
import { useManagedTagTree } from "@/hooks/useManagedTagTree";

type PracticeSortBy = "title" | "updatedAt";

export function usePracticeFilters(problems: Problem[]) {
  const [textInput, setTextInput] = useState("");
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [mode, setMode] = useState<FilterMode>("AND");
  const [sortBy, setSortBy] = useState<PracticeSortBy>("title");
  const [manuallyUnselectedProblems, setManuallyUnselectedProblems] = useState<string[]>([]);

  const tree = useManagedTagTree();

  const filtered = useMemo(
    () =>
      filterProblems(problems, "", selectedTags, selectedTypes, mode, {
        textQueries: searchTerms,
        tagSelector: (problem) => problem.tagPaths,
      }),
    [problems, searchTerms, selectedTags, selectedTypes, mode],
  );

  const collator = useMemo(() => new Intl.Collator("ja"), []);

  const sortedFiltered = useMemo(() => {
    if (sortBy === "updatedAt") {
      return [...filtered].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    }

    return [...filtered].sort((a, b) => collator.compare(a.title, b.title));
  }, [filtered, sortBy, collator]);

  const selectedSet = useMemo(() => {
    const next = new Set(filtered.map((problem) => problem.slug));

    for (const slug of manuallyUnselectedProblems) {
      next.delete(slug);
    }

    return next;
  }, [filtered, manuallyUnselectedProblems]);

  const selectedProblems = useMemo(
    () => filtered.filter((problem) => selectedSet.has(problem.slug)).map((problem) => problem.slug),
    [filtered, selectedSet],
  );

  const toggleProblem = (slug: string) => {
    setManuallyUnselectedProblems((prev) => {
      if (selectedSet.has(slug)) {
        return prev.includes(slug) ? prev : [...prev, slug];
      }

      return prev.filter((item) => item !== slug);
    });
  };

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

  const resetConditions = () => {
    setTextInput("");
    setSearchTerms([]);
    setSelectedTags([]);
    setSelectedTypes([]);
    setMode("AND");
    setSortBy("title");
    setManuallyUnselectedProblems([]);
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
    selectedTypes,
    setSelectedTypes,
    mode,
    setMode,
    sortBy,
    setSortBy,
    resetConditions,
    tree,
    filtered: sortedFiltered,
    selectedProblems,
    selectedSet,
    toggleProblem,
  };
}
