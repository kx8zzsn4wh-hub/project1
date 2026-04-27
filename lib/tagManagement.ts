import { getManagedTagPaths, setManagedTagPaths } from "@/lib/tag-taxonomy";

export type ManagedTag = {
  path: string;
};

function normalizeSegments(rawPath: string): string[] {
  const segments = rawPath
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  const withoutLegacyPrefix = segments[0] === "分野" ? segments.slice(1) : segments;
  return withoutLegacyPrefix.slice(0, 4);
}

export function normalizeTagPath(rawPath: string): string {
  return normalizeSegments(rawPath).join("/");
}

export function normalizeTagPaths(rawPaths: unknown): string[] {
  if (!Array.isArray(rawPaths)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of rawPaths) {
    if (typeof value !== "string") {
      continue;
    }

    const normalized = normalizeTagPath(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function prefixes(path: string): string[] {
  const segments = normalizeSegments(path);
  return segments.map((_, index) => segments.slice(0, index + 1).join("/"));
}

function hasDescendants(pathSet: Set<string>, path: string): boolean {
  for (const candidate of pathSet) {
    if (candidate !== path && candidate.startsWith(`${path}/`)) {
      return true;
    }
  }

  return false;
}

export function validateHierarchicalTagPaths(paths: string[], options?: { minDepth?: number; maxDepth?: number }) {
  const minDepth = options?.minDepth ?? 2;
  const maxDepth = options?.maxDepth ?? 4;

  if (paths.length === 0) {
    throw new Error("階層タグは最低2階層で1つ以上指定してください。");
  }

  for (const path of paths) {
    const depth = normalizeSegments(path).length;
    if (depth < minDepth || depth > maxDepth) {
      throw new Error("階層タグは2〜4階層で指定してください。");
    }
  }
}

export async function listManagedTagPaths(): Promise<string[]> {
  return getManagedTagPaths();
}

export async function ensureTagPaths(paths: string[]): Promise<ManagedTag[]> {
  const normalized = normalizeTagPaths(paths);
  validateHierarchicalTagPaths(normalized);

  const currentPaths = getManagedTagPaths();
  const currentSet = new Set(currentPaths);

  for (const path of normalized) {
    for (const prefix of prefixes(path)) {
      if (!currentSet.has(prefix)) {
        currentSet.add(prefix);
      }
    }
  }

  const nextPaths = Array.from(currentSet).sort((a, b) => a.localeCompare(b, "ja"));
  setManagedTagPaths(nextPaths);

  return normalized.map((path) => ({ path }));
}

export async function moveLeafTag(sourcePath: string, targetParentPath: string) {
  const source = normalizeTagPath(sourcePath);
  const targetParent = normalizeTagPath(targetParentPath);
  const currentSet = new Set(getManagedTagPaths());

  if (!currentSet.has(source)) {
    throw new Error("移動元タグが存在しません。");
  }

  if (!currentSet.has(targetParent)) {
    throw new Error("移動先親タグが存在しません。");
  }

  if (hasDescendants(currentSet, source)) {
    throw new Error("子タグを持つタグの移動は未対応です。まず子タグを整理してください。");
  }

  const sourceSegments = normalizeSegments(source);
  const targetParentSegments = normalizeSegments(targetParent);

  if (targetParentSegments.length >= 4) {
    throw new Error("移動先の階層が深すぎます。最大4階層です。");
  }

  const movedPath = [...targetParentSegments, sourceSegments[sourceSegments.length - 1]].join("/");
  if (normalizeSegments(movedPath).length > 4) {
    throw new Error("移動後の階層が4階層を超えます。");
  }

  if (currentSet.has(movedPath)) {
    throw new Error("同名タグが移動先に既に存在します。");
  }

  currentSet.delete(source);
  currentSet.add(movedPath);
  setManagedTagPaths(Array.from(currentSet));

  return { path: movedPath };
}

export async function deleteLeafTag(path: string) {
  const normalized = normalizeTagPath(path);
  const currentSet = new Set(getManagedTagPaths());

  if (!currentSet.has(normalized)) {
    throw new Error("削除対象タグが存在しません。");
  }

  if (hasDescendants(currentSet, normalized)) {
    throw new Error("子タグがあるため削除できません。");
  }

  currentSet.delete(normalized);
  setManagedTagPaths(Array.from(currentSet));
}

export async function mergeLeafTags(sourcePath: string, targetPath: string) {
  const source = normalizeTagPath(sourcePath);
  const target = normalizeTagPath(targetPath);
  const currentSet = new Set(getManagedTagPaths());

  if (!currentSet.has(source) || !currentSet.has(target)) {
    throw new Error("統合元または統合先タグが存在しません。");
  }

  if (source === target) {
    throw new Error("同じタグ同士は統合できません。");
  }

  if (hasDescendants(currentSet, source)) {
    throw new Error("子タグを持つタグの統合は未対応です。");
  }

  currentSet.delete(source);
  setManagedTagPaths(Array.from(currentSet));
}
