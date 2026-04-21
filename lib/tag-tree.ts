import { getManagedTagPaths } from "@/lib/tag-taxonomy";

export type TagTree = {
  [key: string]: TagTree;
};

function trimSegments(rawPath: string): string[] {
  return rawPath
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

// Normalize toc paths into area/field (2-level) tags.
function normalizeTagPath(rawPath: string): string {
  const segments = trimSegments(rawPath);
  if (segments.length === 0) {
    return "";
  }

  const withoutLegacyPrefix = segments[0] === "分野" ? segments.slice(1) : segments;
  if (withoutLegacyPrefix.length === 0) {
    return "";
  }

  if (withoutLegacyPrefix.length === 1) {
    return withoutLegacyPrefix[0];
  }

  return withoutLegacyPrefix.slice(0, 2).join("/");
}

export function extractTagTermsFromPaths(paths: string[]): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];

  for (const path of paths.map((value) => normalizeTagPath(value)).filter((value) => value.length > 0)) {
    for (const segment of path.split("/")) {
      if (seen.has(segment)) {
        continue;
      }

      seen.add(segment);
      terms.push(segment);
    }
  }

  return terms;
}

export function buildTagTreeFromPaths(paths: string[]): TagTree {
  const root: TagTree = {};

  for (const normalizedPath of paths) {
    const segments = normalizedPath.split("/");

    if (segments.length === 0) {
      continue;
    }

    let cursor = root;

    for (const segment of segments) {
      if (!cursor[segment]) {
        cursor[segment] = {};
      }
      cursor = cursor[segment];
    }
  }

  return root;
}

export function buildTagTree(): TagTree {
  return buildTagTreeFromPaths(getManagedTagPaths());
}
