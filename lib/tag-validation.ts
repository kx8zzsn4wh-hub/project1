function normalizeSegments(rawPath: string): string[] {
  return rawPath
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .slice(0, 4);
}

export function hasRequiredAreaFieldSelection(selectedPaths: string[]): boolean {
  return selectedPaths.some((rawPath) => {
    const depth = normalizeSegments(rawPath).length;
    return depth >= 2 && depth <= 4;
  });
}
