import type { Problem } from "@/lib/problem-types";

export type FilterMode = "AND" | "OR";

type FilterOptions = {
  tagSelector?: (problem: Problem) => string[];
  textQueries?: string[];
};

function matchesTagPath(problemTagPaths: string[], selectedPath: string): boolean {
  return problemTagPaths.some(
    (path) => path === selectedPath || path.startsWith(`${selectedPath}/`),
  );
}

export function filterProblems(
  problems: Problem[],
  textQuery: string,
  selectedTags: string[],
  selectedTypes: string[],
  mode: FilterMode,
  options?: FilterOptions,
): Problem[] {
  const tagSelector = options?.tagSelector ?? ((problem: Problem) => problem.tags);
  const normalizedQueries =
    options?.textQueries
      ?.map((query) => query.trim().toLowerCase())
      .filter((query) => query.length > 0) ?? [];
  const normalizedQuery = textQuery.trim().toLowerCase();

  return problems.filter((problem) => {
    const queries = normalizedQueries.length > 0 ? normalizedQueries : normalizedQuery ? [normalizedQuery] : [];
    const hasText = queries.length > 0;
    const hasTags = selectedTags.length > 0;
    const hasTypes = selectedTypes.length > 0;

    const lowerTitle = problem.title.toLowerCase();
    const textMatch = hasText
      ? mode === "AND"
        ? queries.every((query) => lowerTitle.includes(query))
        : queries.some((query) => lowerTitle.includes(query))
      : true;
    const problemTags = tagSelector(problem);
    const tagMatch = hasTags
      ? mode === "AND"
        ? selectedTags.every((selectedTag) => matchesTagPath(problemTags, selectedTag))
        : selectedTags.some((selectedTag) => matchesTagPath(problemTags, selectedTag))
      : true;
    const typeMatch = hasTypes ? problem.type.some((type) => selectedTypes.includes(type)) : true;

    if (mode === "AND") {
      return textMatch && tagMatch && typeMatch;
    }

    if (!hasText && !hasTags && !hasTypes) {
      return true;
    }

    return (hasText && textMatch) || (hasTags && tagMatch) || (hasTypes && typeMatch);
  });
}
