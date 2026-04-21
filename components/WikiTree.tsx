"use client";

import { useMemo, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { TagTree } from "@/lib/tag-tree";

type WikiTreeProps = {
  tree: TagTree;
  activePath: string;
  onPathSelect: (path: string) => void;
  counts: Record<string, number>;
  expandAll?: boolean;
};

type WikiTreeNodeProps = {
  label: string;
  node: TagTree;
  parentPath: string;
  activePath: string;
  onPathSelect: (path: string) => void;
  counts: Record<string, number>;
  expandAll: boolean;
};

function WikiTreeNode({
  label,
  node,
  parentPath,
  activePath,
  onPathSelect,
  counts,
  expandAll,
}: WikiTreeNodeProps) {
  const currentPath = useMemo(() => (parentPath ? `${parentPath}/${label}` : label), [parentPath, label]);
  const isActive = activePath === currentPath;
  const isAncestor = activePath.startsWith(`${currentPath}/`);
  const children = Object.entries(node);
  const count = counts[currentPath] ?? 0;
  const [manuallyOpen, setManuallyOpen] = useState(false);
  const isOpen = expandAll || isActive || isAncestor || manuallyOpen;

  if (children.length === 0) {
    return (
      <button
        type="button"
        onClick={() => onPathSelect(currentPath)}
        className={`w-full rounded-md px-2 py-1 text-left text-sm transition-colors ${
          isActive ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"
        }`}
      >
        <span className="flex items-center justify-between gap-3">
          <span className="truncate">{label}</span>
          <span className={`text-xs ${isActive ? "text-zinc-200" : "text-zinc-500"}`}>{count}</span>
        </span>
      </button>
    );
  }

  return (
    <Accordion
      type="single"
      collapsible
      className="w-full"
      value={isOpen ? currentPath : ""}
      onValueChange={(value) => {
        if (expandAll) {
          return;
        }
        setManuallyOpen(value === currentPath);
      }}
    >
      <AccordionItem value={currentPath}>
        <AccordionTrigger
          className={`rounded-md px-2 py-1 text-sm hover:no-underline ${isActive ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}
          onClick={() => onPathSelect(currentPath)}
        >
          <span className="flex w-full items-center justify-between gap-3 text-left">
            <span className="truncate">{label}</span>
            <span className={`text-xs ${isActive ? "text-zinc-200" : "text-zinc-500"}`}>{count}</span>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-1 pl-4">
            {children.map(([childLabel, childNode]) => (
              <WikiTreeNode
                key={childLabel}
                label={childLabel}
                node={childNode}
                parentPath={currentPath}
                activePath={activePath}
                onPathSelect={onPathSelect}
                counts={counts}
                expandAll={expandAll}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function WikiTree({ tree, activePath, onPathSelect, counts, expandAll = false }: WikiTreeProps) {
  return (
    <div className="space-y-1">
      {Object.entries(tree).map(([label, node]) => (
        <WikiTreeNode
          key={label}
          label={label}
          node={node}
          parentPath=""
          activePath={activePath}
          onPathSelect={onPathSelect}
          counts={counts}
          expandAll={expandAll}
        />
      ))}
    </div>
  );
}
