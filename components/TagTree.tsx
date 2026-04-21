"use client";

import { useMemo } from "react";
import type { TagTree } from "@/lib/tag-tree";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";

type TagTreeProps = {
  tree: TagTree;
  selectedTags: string[];
  onChange: (next: string[]) => void;
};

type TagTreeNodeProps = {
  label: string;
  node: TagTree;
  parentPath: string;
  selectedSet: Set<string>;
  onToggle: (path: string, checked: boolean) => void;
};

function TagTreeNode({ label, node, parentPath, selectedSet, onToggle }: TagTreeNodeProps) {
  const currentPath = parentPath ? `${parentPath}/${label}` : label;
  const children = Object.entries(node);
  const checkState = selectedSet.has(label);

  const handleCheckedChange = (value: boolean | "indeterminate") => {
    onToggle(currentPath, value === true);
  };

  if (children.length === 0) {
    return (
      <label className="flex items-center gap-2 py-1 text-sm">
        <Checkbox checked={checkState} onCheckedChange={handleCheckedChange} aria-label={currentPath} />
        <span>{label}</span>
      </label>
    );
  }

  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem value={currentPath}>
        <div className="flex items-center gap-2 py-1">
          <Checkbox
            checked={checkState}
            onCheckedChange={handleCheckedChange}
            aria-label={currentPath}
          />
          <AccordionTrigger className="py-0 hover:no-underline">{label}</AccordionTrigger>
        </div>
        <AccordionContent>
          <div className="pl-4">
            {children.map(([childLabel, childNode]) => (
              <TagTreeNode
                key={childLabel}
                label={childLabel}
                node={childNode}
                parentPath={currentPath}
                selectedSet={selectedSet}
                onToggle={onToggle}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function TagTree({ tree, selectedTags, onChange }: TagTreeProps) {
  const selectedSet = useMemo(() => new Set(selectedTags), [selectedTags]);

  const ancestorsByPath = useMemo(() => {
    const map = new Map<string, string[]>();

    const walk = (node: TagTree, parentSegments: string[]) => {
      for (const [label, childNode] of Object.entries(node)) {
        const currentSegments = [...parentSegments, label];
        const currentPath = currentSegments.join("/");
        map.set(currentPath, parentSegments);
        walk(childNode, currentSegments);
      }
    };

    walk(tree, []);
    return map;
  }, [tree]);

  const handleToggle = (path: string, checked: boolean) => {
    const segments = path.split("/");
    const tag = segments[segments.length - 1];
    const next = new Set(selectedSet);

    if (checked) {
      next.add(tag);

      const ancestors = ancestorsByPath.get(path) ?? [];
      for (const ancestor of ancestors) {
        next.add(ancestor);
      }
    } else {
      next.delete(tag);
    }

    onChange(Array.from(next).sort((a, b) => a.localeCompare(b, "ja")));
  };

  return (
    <Accordion type="single" collapsible defaultValue="tag-tree-root" className="w-full">
      <AccordionItem value="tag-tree-root" className="border-none">
        <AccordionTrigger className="py-1 text-sm hover:no-underline">タグツリー</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-1 pt-1">
            {Object.entries(tree).map(([label, node]) => (
              <TagTreeNode
                key={label}
                label={label}
                node={node}
                parentPath=""
                selectedSet={selectedSet}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
