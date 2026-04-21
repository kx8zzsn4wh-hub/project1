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
      if (!item || typeof item !== "object") {
        continue;
      }

      const preset = item as Partial<PracticePreset>;
      if (
        typeof preset.id !== "string" ||
        typeof preset.name !== "string" ||
        typeof preset.createdAt !== "string" ||
        typeof preset.total !== "number" ||
        typeof preset.correct !== "number" ||
        (typeof preset.partial !== "number" && preset.partial !== undefined) ||
        !Array.isArray(preset.ids) ||
        !preset.ids.every((id) => typeof id === "string")
      ) {
        continue;
      }

      normalized.push({
        id: preset.id,
        name: preset.name,
        createdAt: preset.createdAt,
        total: preset.total,
        correct: preset.correct,
        partial: typeof preset.partial === "number" ? preset.partial : 0,
        ids: preset.ids,
        bookmarked: preset.bookmarked === true,
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
