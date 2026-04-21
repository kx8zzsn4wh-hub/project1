"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createPracticePreset, loadPracticePresets, savePracticePresets } from "@/lib/practice-presets";

type PracticeResultActionsProps = {
  total: number;
  correct: number;
  partial: number;
  problemIds: string[];
};

function buildDefaultPresetName(total: number, correct: number): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `演習結果 ${y}-${m}-${d} (${correct}/${total})`;
}

export function PracticeResultActions({ total, correct, partial, problemIds }: PracticeResultActionsProps) {
  const [message, setMessage] = useState("");
  const [registered, setRegistered] = useState(false);
  const [bookmarkedOnRegister, setBookmarkedOnRegister] = useState(true);

  const allIds = useMemo(() => {
    const set = new Set<string>(problemIds);
    return Array.from(set);
  }, [problemIds]);

  const handleRegisterPreset = () => {
    if (registered) {
      return;
    }

    const preset = createPracticePreset({
      name: buildDefaultPresetName(total, correct),
      total,
      correct,
      partial,
      ids: allIds,
      bookmarked: bookmarkedOnRegister,
    });

    const current = loadPracticePresets();
    savePracticePresets([preset, ...current]);
    setRegistered(true);
    setMessage(
      bookmarkedOnRegister
        ? "プリセットを登録し、ブックマークしました。トップページから直接再演習できます。"
        : "プリセット登録しました。プリセット一覧から再演習できます。",
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      <label className="flex w-full items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={bookmarkedOnRegister}
          onChange={(event) => setBookmarkedOnRegister(event.target.checked)}
          disabled={registered}
          className="h-4 w-4 rounded border-zinc-300"
        />
        登録時にブックマークする
      </label>
      <button
        type="button"
        onClick={handleRegisterPreset}
        disabled={registered}
        className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50"
      >
        {registered ? "プリセット登録済み" : "プリセット登録"}
      </button>
      <Link
        href="/presets"
        className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
      >
        プリセット一覧
      </Link>
      {message ? <p className="w-full text-sm text-emerald-700">{message}</p> : null}
    </div>
  );
}
