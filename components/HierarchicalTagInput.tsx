"use client";

import { useState } from "react";
import { TagTree as TagTreeWidget } from "@/components/TagTree";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TagTree } from "@/lib/tag-tree";

type Props = {
  tree: TagTree;
  selectedPaths: string[];
  onChange: (paths: string[]) => void;
};

const LEVEL_PLACEHOLDERS = ["循環器", "心不全", "左心不全", "（任意）"] as const;

export function HierarchicalTagInput({ tree, selectedPaths, onChange }: Props) {
  const [levels, setLevels] = useState<[string, string, string, string]>(["", "", "", ""]);

  const updateLevel = (index: 0 | 1 | 2 | 3, value: string) => {
    const next = [...levels] as [string, string, string, string];
    next[index] = value;
    // Clear lower levels when an upper level is changed
    for (let j = index + 1; j < 4; j++) next[j] = "";
    setLevels(next);
  };

  const handleTreeChange = (newPaths: string[]) => {
    // Find which path was newly checked and auto-fill the inputs
    const prevSet = new Set(selectedPaths);
    const added = newPaths.find((p) => !prevSet.has(p));
    if (added) {
      const parts = added.split("/");
      setLevels([parts[0] ?? "", parts[1] ?? "", parts[2] ?? "", parts[3] ?? ""]);
    }
    onChange(newPaths);
  };

  const addCurrentPath = () => {
    const pathParts = levels.map((l) => l.trim()).filter((l) => l.length > 0);
    if (pathParts.length < 2) return;
    const path = pathParts.join("/");
    if (!selectedPaths.includes(path)) {
      onChange([...selectedPaths, path].sort((a, b) => a.localeCompare(b, "ja")));
    }
    setLevels(["", "", "", ""]);
  };

  const removePath = (path: string) => {
    onChange(selectedPaths.filter((p) => p !== path));
  };

  const currentPath = levels
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("/");

  const canAdd = currentPath.split("/").length >= 2 && !selectedPaths.includes(currentPath);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">階層タグ設定</p>

      <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-xs text-zinc-500">
          タグツリーから選択すると自動入力されます。手入力も可能です（レベル1・2は必須、3・4は任意）。
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([0, 1, 2, 3] as const).map((i) => (
            <div key={i} className="space-y-1">
              <p className="text-xs font-medium text-zinc-600">
                レベル{i + 1}
                {i < 2 ? (
                  <span className="ml-0.5 text-red-500">*</span>
                ) : (
                  <span className="ml-0.5 text-zinc-400">（任意）</span>
                )}
              </p>
              <Input
                value={levels[i]}
                onChange={(e) => updateLevel(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCurrentPath();
                  }
                }}
                placeholder={LEVEL_PLACEHOLDERS[i]}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>

        {currentPath.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-xs text-zinc-500">
            <span>追加予定:</span>
            {currentPath.split("/").map((seg, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {seg}
              </Badge>
            ))}
          </div>
        )}

        <Button type="button" variant="outline" size="sm" onClick={addCurrentPath} disabled={!canAdd}>
          タグを追加
        </Button>
      </div>

      {selectedPaths.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-zinc-500">選択済みタグ（× で削除）</p>
          <div className="space-y-1.5">
            {selectedPaths.map((path) => (
              <div key={path} className="flex items-center gap-1">
                {path.split("/").map((segment, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {segment}
                  </Badge>
                ))}
                <button
                  type="button"
                  onClick={() => removePath(path)}
                  className="ml-0.5 rounded px-1 text-xs text-zinc-400 hover:text-red-600"
                  aria-label={`${path}を削除`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <TagTreeWidget tree={tree} selectedTags={selectedPaths} onChange={handleTreeChange} />
    </div>
  );
}
