function splitTagSegments(raw: string): string[] {
  return raw
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

export function toIndependentTagList(tags: string[], tagPaths: string[] = []): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const push = (value: string) => {
    if (!value || value.includes("/") || seen.has(value)) {
      return;
    }

    seen.add(value);
    result.push(value);
  };

  for (const rawTag of tags) {
    for (const segment of splitTagSegments(rawTag)) {
      push(segment);
    }
  }

  for (const rawPath of tagPaths) {
    for (const segment of splitTagSegments(rawPath)) {
      push(segment);
    }
  }

  return result;
}
