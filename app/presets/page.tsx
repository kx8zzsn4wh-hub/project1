"use client";

import Link from "next/link";
import { useState } from "react";
import { AccuracyBar } from "@/components/AccuracyBar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadPracticePresets, savePracticePresets, type PracticePreset } from "@/lib/practice-presets";

export default function PresetsPage() {
  const [presets, setPresets] = useState<PracticePreset[]>(() => loadPracticePresets());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const applyPresets = (next: PracticePreset[]) => {
    setPresets(next);
    savePracticePresets(next);
  };

  const removePreset = (id: string) => {
    const next = presets.filter((preset) => preset.id !== id);
    applyPresets(next);
  };

  const toggleBookmark = (id: string) => {
    const next = presets.map((preset) =>
      preset.id === id ? { ...preset, bookmarked: !preset.bookmarked } : preset,
    );
    applyPresets(next);
  };

  const startRename = (preset: PracticePreset) => {
    setEditingId(preset.id);
    setEditingName(preset.name);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveRename = (id: string) => {
    const name = editingName.trim();
    if (!name) {
      return;
    }

    const next = presets.map((preset) =>
      preset.id === id ? { ...preset, name } : preset,
    );
    applyPresets(next);
    cancelRename();
  };

  const moveBookmarkedPreset = (id: string, direction: "up" | "down") => {
    const bookmarkedIndices = presets
      .map((preset, index) => (preset.bookmarked ? index : -1))
      .filter((index) => index >= 0);
    const currentBookmarkPosition = bookmarkedIndices.findIndex((index) => presets[index]?.id === id);
    if (currentBookmarkPosition < 0) {
      return;
    }

    const nextBookmarkPosition = direction === "up"
      ? currentBookmarkPosition - 1
      : currentBookmarkPosition + 1;

    if (nextBookmarkPosition < 0 || nextBookmarkPosition >= bookmarkedIndices.length) {
      return;
    }

    const from = bookmarkedIndices[currentBookmarkPosition];
    const to = bookmarkedIndices[nextBookmarkPosition];
    const next = [...presets];
    [next[from], next[to]] = [next[to], next[from]];
    applyPresets(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">プリセット</h1>
        <Badge variant="outline">{presets.length}件</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">登録済みプリセット</CardTitle>
        </CardHeader>
        <CardContent>
          {presets.length === 0 ? (
            <p className="text-sm text-zinc-600">プリセットはまだありません。演習結果画面から登録できます。</p>
          ) : (
            <ul className="space-y-3">
              {presets.map((preset) => {
                const bookmarkedIds = presets.filter((item) => item.bookmarked).map((item) => item.id);
                const bookmarkIndex = bookmarkedIds.indexOf(preset.id);
                const canMoveUp = preset.bookmarked && bookmarkIndex > 0;
                const canMoveDown = preset.bookmarked && bookmarkIndex >= 0 && bookmarkIndex < bookmarkedIds.length - 1;

                return (
                <li key={preset.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {editingId === preset.id ? (
                          <input
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                saveRename(preset.id);
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                cancelRename();
                              }
                            }}
                            className="h-9 w-72 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                            placeholder="プリセット名"
                            autoFocus
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => startRename(preset)}
                            className="rounded px-1 py-0.5 text-left font-medium text-zinc-900 transition-colors hover:bg-zinc-100"
                            title="クリックで名前を編集"
                          >
                            {preset.name}
                          </button>
                        )}
                        {preset.bookmarked ? <Badge variant="secondary">ブックマーク</Badge> : null}
                      </div>
                      <p className="text-xs text-zinc-600">{new Date(preset.createdAt).toLocaleString("ja-JP")}</p>
                      <p className="text-sm text-zinc-700">正解: {preset.correct} / {preset.total}</p>
                      <div className="max-w-sm pt-1">
                        <AccuracyBar correct={preset.correct} partial={preset.partial} total={preset.total} size="sm" />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editingId === preset.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => saveRename(preset.id)}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
                          >
                            名前保存
                          </button>
                          <button
                            type="button"
                            onClick={cancelRename}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
                          >
                            キャンセル
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => toggleBookmark(preset.id)}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
                      >
                        {preset.bookmarked ? "ブックマーク解除" : "ブックマーク"}
                      </button>
                      {preset.bookmarked ? (
                        <>
                          <button
                            type="button"
                            onClick={() => moveBookmarkedPreset(preset.id, "up")}
                            disabled={!canMoveUp}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50"
                          >
                            上へ
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBookmarkedPreset(preset.id, "down")}
                            disabled={!canMoveDown}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50"
                          >
                            下へ
                          </button>
                        </>
                      ) : null}
                      <Link
                        href={`/practice/session?ids=${encodeURIComponent(preset.ids.join(","))}`}
                        className="inline-flex h-9 items-center justify-center rounded-md bg-black px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-black/85"
                      >
                        このプリセットで演習
                      </Link>
                      <button
                        type="button"
                        onClick={() => removePreset(preset.id)}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
