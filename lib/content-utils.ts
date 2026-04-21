import fs from "node:fs";
import path from "node:path";

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function slugifyTitleWithPrefix(title: string, prefix: string): string {
  const normalized = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (normalized.length > 0) {
    return `${prefix}-${normalized}`;
  }

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${prefix}-${stamp}`;
}

export function createUniqueSlug(baseSlug: string, dirPath: string): string {
  if (!fs.existsSync(path.join(dirPath, `${baseSlug}.md`))) {
    return baseSlug;
  }

  for (let index = 2; index <= 9999; index += 1) {
    const candidate = `${baseSlug}-${index}`;
    if (!fs.existsSync(path.join(dirPath, `${candidate}.md`))) {
      return candidate;
    }
  }

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${baseSlug}-${stamp}`;
}

export function toYamlList(items: string[]): string {
  return items.map((item) => `  - ${JSON.stringify(item)}`).join("\n");
}
