import fs from "node:fs";
import path from "node:path";
import { getAllProblems } from "@/lib/problems";

export type AreaFieldTags = Record<string, Record<string, string[]>>;

type OrderedTaxonomyField = {
  name: string;
  children: string[];
};

type OrderedTaxonomyArea = {
  name: string;
  fields: OrderedTaxonomyField[];
};

type OrderedTagTaxonomy = {
  version: 2;
  areas: OrderedTaxonomyArea[];
};

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

function toOrderedTaxonomyFromLegacy(legacy: AreaFieldTags): OrderedTagTaxonomy {
  return {
    version: 2,
    areas: Object.entries(legacy).map(([areaName, fields]) => ({
      name: areaName,
      fields: Object.entries(fields).map(([fieldName, children]) => ({
        name: fieldName,
        children: children
          .filter((child): child is string => typeof child === "string")
          .map((child) => child.trim())
          .filter((child) => child.length > 0),
      })),
    })),
  };
}

function normalizeOrderedTaxonomy(input: unknown): OrderedTagTaxonomy | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Partial<OrderedTagTaxonomy>;
  if (!Array.isArray(candidate.areas)) {
    return null;
  }

  const areas: OrderedTaxonomyArea[] = [];
  for (const rawArea of candidate.areas) {
    if (!rawArea || typeof rawArea !== "object") {
      continue;
    }

    const areaName = typeof (rawArea as { name?: unknown }).name === "string" ? (rawArea as { name: string }).name.trim() : "";
    if (!areaName) {
      continue;
    }

    const fields: OrderedTaxonomyField[] = [];
    const rawFields = (rawArea as { fields?: unknown }).fields;
    if (Array.isArray(rawFields)) {
      for (const rawField of rawFields) {
        if (!rawField || typeof rawField !== "object") {
          continue;
        }

        const fieldName = typeof (rawField as { name?: unknown }).name === "string" ? (rawField as { name: string }).name.trim() : "";
        if (!fieldName) {
          continue;
        }

        const children = Array.isArray((rawField as { children?: unknown }).children)
          ? ((rawField as { children: unknown[] }).children
              .filter((child): child is string => typeof child === "string")
              .map((child) => child.trim())
              .filter((child) => child.length > 0))
          : [];

        fields.push({ name: fieldName, children: Array.from(new Set(children)) });
      }
    }

    areas.push({ name: areaName, fields });
  }

  return { version: 2, areas };
}

function normalizePathsInput(paths: string[]): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();

  const push = (pathValue: string) => {
    const normalizedPath = normalizeSegments(pathValue).join("/");
    if (!normalizedPath || seen.has(normalizedPath)) {
      return;
    }

    seen.add(normalizedPath);
    normalized.push(normalizedPath);
  };

  for (const rawPath of paths) {
    const segments = normalizeSegments(rawPath);
    if (segments.length < 2) {
      continue;
    }

    push(segments.join("/"));
    if (segments.length > 2) {
      push(segments.slice(0, 2).join("/"));
    }
  }

  return normalized;
}

function findArea(areas: OrderedTaxonomyArea[], areaName: string): OrderedTaxonomyArea | undefined {
  return areas.find((area) => area.name === areaName);
}

function findField(fields: OrderedTaxonomyField[], fieldName: string): OrderedTaxonomyField | undefined {
  return fields.find((field) => field.name === fieldName);
}

function buildOrderedTaxonomyByInputOrder(paths: string[]): OrderedTagTaxonomy {
  const normalizedPaths = normalizePathsInput(paths);
  const areas: OrderedTaxonomyArea[] = [];

  for (const pathValue of normalizedPaths) {
    const segments = normalizeSegments(pathValue);
    if (segments.length < 2) {
      continue;
    }

    const [areaName, fieldName, ...childSegments] = segments;
    let area = findArea(areas, areaName);
    if (!area) {
      area = { name: areaName, fields: [] };
      areas.push(area);
    }

    let field = findField(area.fields, fieldName);
    if (!field) {
      field = { name: fieldName, children: [] };
      area.fields.push(field);
    }

    const childPath = childSegments.join("/");
    if (childPath && !field.children.includes(childPath)) {
      field.children.push(childPath);
    }
  }

  return { version: 2, areas };
}

function buildOrderedTaxonomyFromPaths(paths: string[], base: OrderedTagTaxonomy): OrderedTagTaxonomy {
  const normalizedPaths = normalizePathsInput(paths);
  const includeSet = new Set(normalizedPaths);
  const nextAreas: OrderedTaxonomyArea[] = [];

  // Keep existing order where possible.
  for (const area of base.areas) {
    const keptFields: OrderedTaxonomyField[] = [];
    for (const field of area.fields) {
      const prefix = `${area.name}/${field.name}`;
      const keepField = includeSet.has(prefix) || normalizedPaths.some((pathValue) => pathValue.startsWith(`${prefix}/`));
      if (!keepField) {
        continue;
      }

      const keptChildren = field.children.filter((child) => includeSet.has(`${prefix}/${child}`));
      keptFields.push({ name: field.name, children: keptChildren });
    }

    if (keptFields.length > 0) {
      nextAreas.push({ name: area.name, fields: keptFields });
    }
  }

  // Add new nodes by incoming path order.
  for (const pathValue of normalizedPaths) {
    const segments = normalizeSegments(pathValue);
    if (segments.length < 2) {
      continue;
    }

    const [areaName, fieldName, ...childSegments] = segments;
    let area = findArea(nextAreas, areaName);
    if (!area) {
      area = { name: areaName, fields: [] };
      nextAreas.push(area);
    }

    let field = findField(area.fields, fieldName);
    if (!field) {
      field = { name: fieldName, children: [] };
      area.fields.push(field);
    }

    const childPath = childSegments.join("/");
    if (childPath && !field.children.includes(childPath)) {
      field.children.push(childPath);
    }
  }

  return { version: 2, areas: nextAreas };
}

function flattenTaxonomyToPaths(taxonomy: OrderedTagTaxonomy): string[] {
  const paths: string[] = [];

  for (const area of taxonomy.areas) {
    for (const field of area.fields) {
      paths.push(`${area.name}/${field.name}`);
      for (const child of field.children) {
        paths.push(`${area.name}/${field.name}/${child}`);
      }
    }
  }

  return Array.from(new Set(paths))
    .map((pathValue) => normalizeSegments(pathValue).join("/"))
    .filter((pathValue) => pathValue.length >= 3);
}

function collectRequiredTagPaths(): string[] {
  const required = new Set<string>();

  const defaultTaxonomy = toOrderedTaxonomyFromLegacy(cloneDefaultTags());
  for (const pathValue of flattenTaxonomyToPaths(defaultTaxonomy)) {
    required.add(pathValue);
  }

  const contents = [...getAllProblems("problem"), ...getAllProblems("wiki")];
  for (const content of contents) {
    for (const rawPath of content.tagPaths) {
      const segments = normalizeSegments(rawPath);
      if (segments.length < 2) {
        continue;
      }

      for (let depth = 2; depth <= segments.length; depth += 1) {
        required.add(segments.slice(0, depth).join("/"));
      }
    }
  }

  return Array.from(required);
}

function applyDisplayOrderOnlyGuard(candidate: OrderedTagTaxonomy): OrderedTagTaxonomy {
  const requiredPaths = collectRequiredTagPaths();
  return buildOrderedTaxonomyFromPaths(requiredPaths, candidate);
}

function readTaxonomyFile(): OrderedTagTaxonomy {
  const fallback = toOrderedTaxonomyFromLegacy(cloneDefaultTags());

  if (!fs.existsSync(TAXONOMY_FILE_PATH)) {
    return applyDisplayOrderOnlyGuard(fallback);
  }

  try {
    const raw = fs.readFileSync(TAXONOMY_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;

    const normalizedOrdered = normalizeOrderedTaxonomy(parsed);
    if (normalizedOrdered) {
      return applyDisplayOrderOnlyGuard(normalizedOrdered);
    }

    if (!parsed || typeof parsed !== "object") {
      return applyDisplayOrderOnlyGuard(fallback);
    }

    const normalizedLegacy: AreaFieldTags = {};

    for (const [area, fields] of Object.entries(parsed as Record<string, unknown>)) {
      if (!fields || typeof fields !== "object") {
        continue;
      }

      normalizedLegacy[area] = {};
      for (const [field, children] of Object.entries(fields as Record<string, unknown>)) {
        if (!Array.isArray(children)) {
          normalizedLegacy[area][field] = [];
          continue;
        }

        normalizedLegacy[area][field] = children
          .filter((child): child is string => typeof child === "string")
          .map((child) => child.trim())
          .filter((child) => child.length > 0);
      }
    }

    if (Object.keys(normalizedLegacy).length === 0) {
      return applyDisplayOrderOnlyGuard(fallback);
    }

    return applyDisplayOrderOnlyGuard(toOrderedTaxonomyFromLegacy(normalizedLegacy));
  } catch {
    return applyDisplayOrderOnlyGuard(fallback);
  }
}

function writeTaxonomyFile(taxonomy: OrderedTagTaxonomy) {
  fs.mkdirSync(path.dirname(TAXONOMY_FILE_PATH), { recursive: true });
  fs.writeFileSync(TAXONOMY_FILE_PATH, `${JSON.stringify(taxonomy, null, 2)}\n`, "utf-8");
}

export function getManagedTagPaths(): string[] {
  return flattenTaxonomyToPaths(readTaxonomyFile());
}

export function setManagedTagPaths(paths: string[], options?: { preserveExistingOrder?: boolean }) {
  const preserveExistingOrder = options?.preserveExistingOrder ?? true;
  const taxonomy = preserveExistingOrder
    ? buildOrderedTaxonomyFromPaths(paths, readTaxonomyFile())
    : buildOrderedTaxonomyByInputOrder(paths);
  writeTaxonomyFile(taxonomy);
}
