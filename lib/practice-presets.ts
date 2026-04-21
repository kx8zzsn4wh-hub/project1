export type PracticePreset = {
  id: string;
  name: string;
  createdAt: string;
  total: number;
  correct: number;
  partial: number;
  ids: string[];
  bookmarked: boolean;
};

const STORAGE_KEY = "project1.practicePresets";

type ParsedPreset = {
  id: string;
  name: string;
  createdAt: string;
  total: number;
  correct: number;
  partial?: number;
  ids: string[];
  bookmarked?: boolean;
};

function isParsedPreset(value: unknown): value is ParsedPreset {
  if (!value || typeof value !== "object") {
    return false;
  }

  const preset = value as Partial<ParsedPreset>;

  return (
    typeof preset.id === "string" &&
    typeof preset.name === "string" &&
    typeof preset.createdAt === "string" &&
    typeof preset.total === "number" &&
    typeof preset.correct === "number" &&
    (typeof preset.partial === "number" || preset.partial === undefined) &&
    Array.isArray(preset.ids) &&
    preset.ids.every((id) => typeof id === "string")
  );
}

function parsePresets(raw: string | null): PracticePreset[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const normalized: PracticePreset[] = [];

    for (const item of parsed) {
      if (!isParsedPreset(item)) {
        continue;
      }

      normalized.push({
        id: item.id,
        name: item.name,
        createdAt: item.createdAt,
        total: item.total,
        correct: item.correct,
        partial: typeof item.partial === "number" ? item.partial : 0,
        ids: item.ids,
        bookmarked: item.bookmarked === true,
      });
    }

    return normalized;
  } catch {
    return [];
  }
}

export function loadPracticePresets(): PracticePreset[] {
  if (typeof window === "undefined") {
    return [];
  }

  return parsePresets(window.localStorage.getItem(STORAGE_KEY));
}

export function savePracticePresets(presets: PracticePreset[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function createPracticePreset(params: {
  name: string;
  total: number;
  correct: number;
  partial?: number;
  ids: string[];
  bookmarked?: boolean;
}): PracticePreset {
  const stamp = new Date();
  return {
    id: `${stamp.getTime()}`,
    name: params.name,
    createdAt: stamp.toISOString(),
    total: params.total,
    correct: params.correct,
    partial: Math.max(params.partial ?? 0, 0),
    ids: params.ids,
    bookmarked: params.bookmarked === true,
  };
}
