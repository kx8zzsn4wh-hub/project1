import fs from "node:fs";
import path from "node:path";

export type AreaFieldTags = Record<string, Record<string, string[]>>;

const DEFAULT_AREA_FIELD_TAGS: AreaFieldTags = {
  循環器: {
    心不全: [],
    不整脈: [],
    虚血性心疾患: [],
    弁膜症: [],
    心筋症: [],
    心膜疾患: [],
    先天性心疾患: [],
    大動脈疾患: [],
    末梢動脈疾患: [],
    静脈疾患: [],
    リンパ管疾患: [],
    血圧疾患: [],
    腫瘍性心疾患: [],
    循環器外傷: [],
  },
  呼吸器: {
    呼吸器感染症: [],
    アレルギー性呼吸器疾患: [],
    膠原病性呼吸器疾患: [],
    実質性肺疾患: [],
    "肺・気管支の形態異常": [],
    肺循環障害: [],
    異常呼吸: [],
    肺腫瘍性疾患: [],
    胸膜疾患: [],
    縦郭疾患: [],
    横隔膜疾患: [],
    呼吸器外傷: [],
  },
  その他の科目: {
    臨床技能１: [],
    臨床技能２: [],
    リハビリテーション: [],
  },
};

const TAXONOMY_FILE_PATH = path.join(process.cwd(), "data", "tag-taxonomy.json");

function normalizeSegments(rawPath: string): string[] {
  const segments = rawPath
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  const withoutLegacyPrefix = segments[0] === "分野" ? segments.slice(1) : segments;
  return withoutLegacyPrefix.slice(0, 4);
}

function cloneDefaultTags(): AreaFieldTags {
  return JSON.parse(JSON.stringify(DEFAULT_AREA_FIELD_TAGS)) as AreaFieldTags;
}

function buildTaxonomyFromPaths(paths: string[]): AreaFieldTags {
  const taxonomy: AreaFieldTags = {};

  for (const rawPath of paths) {
    const segments = normalizeSegments(rawPath);
    if (segments.length < 2) {
      continue;
    }

    const area = segments[0];
    const field = segments[1];
    const lowerPath = segments.slice(2).join("/");

    taxonomy[area] ??= {};
    taxonomy[area][field] ??= [];

    if (lowerPath.length > 0 && !taxonomy[area][field].includes(lowerPath)) {
      taxonomy[area][field].push(lowerPath);
    }
  }

  for (const area of Object.keys(taxonomy)) {
    for (const field of Object.keys(taxonomy[area])) {
      taxonomy[area][field].sort((a, b) => a.localeCompare(b, "ja"));
    }
  }

  return taxonomy;
}

function flattenTaxonomyToPaths(taxonomy: AreaFieldTags): string[] {
  const paths: string[] = [];

  for (const [area, fields] of Object.entries(taxonomy)) {
    for (const [field, children] of Object.entries(fields)) {
      paths.push(`${area}/${field}`);
      for (const child of children) {
        paths.push(`${area}/${field}/${child}`);
      }
    }
  }

  return Array.from(new Set(paths))
    .map((pathValue) => normalizeSegments(pathValue).join("/"))
    .filter((pathValue) => pathValue.length >= 3)
    .sort((a, b) => a.localeCompare(b, "ja"));
}

function readTaxonomyFile(): AreaFieldTags {
  if (!fs.existsSync(TAXONOMY_FILE_PATH)) {
    return cloneDefaultTags();
  }

  try {
    const raw = fs.readFileSync(TAXONOMY_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return cloneDefaultTags();
    }

    const normalized: AreaFieldTags = {};

    for (const [area, fields] of Object.entries(parsed as Record<string, unknown>)) {
      if (!fields || typeof fields !== "object") {
        continue;
      }

      normalized[area] = {};
      for (const [field, children] of Object.entries(fields as Record<string, unknown>)) {
        if (!Array.isArray(children)) {
          normalized[area][field] = [];
          continue;
        }

        normalized[area][field] = children
          .filter((child): child is string => typeof child === "string")
          .map((child) => child.trim())
          .filter((child) => child.length > 0);
      }
    }

    return Object.keys(normalized).length > 0 ? normalized : cloneDefaultTags();
  } catch {
    return cloneDefaultTags();
  }
}

function writeTaxonomyFile(taxonomy: AreaFieldTags) {
  fs.mkdirSync(path.dirname(TAXONOMY_FILE_PATH), { recursive: true });
  fs.writeFileSync(TAXONOMY_FILE_PATH, `${JSON.stringify(taxonomy, null, 2)}\n`, "utf-8");
}

export function getManagedTagPaths(): string[] {
  return flattenTaxonomyToPaths(readTaxonomyFile());
}

export function setManagedTagPaths(paths: string[]) {
  const taxonomy = buildTaxonomyFromPaths(paths);
  writeTaxonomyFile(taxonomy);
}
