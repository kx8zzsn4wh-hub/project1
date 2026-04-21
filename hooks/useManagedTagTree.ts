"use client";

import { useEffect, useRef, useState } from "react";
import { buildTagTree, buildTagTreeFromPaths, type TagTree } from "@/lib/tag-tree";

type TagPathsResponse = {
  ok?: boolean;
  paths?: string[];
};

export function useManagedTagTree(pollMs = 20000): TagTree {
  const [tree, setTree] = useState<TagTree>(() => buildTagTree());
  const signatureRef = useRef("");

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const response = await fetch("/api/tag-paths", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as TagPathsResponse;
        if (!active || !Array.isArray(payload.paths)) {
          return;
        }

        const nextSignature = payload.paths.join("||");
        if (signatureRef.current === nextSignature) {
          return;
        }

        signatureRef.current = nextSignature;
        setTree(buildTagTreeFromPaths(payload.paths));
      } catch {
        // Keep previous tree when fetch fails.
      }
    };

    void refresh();
    const intervalId = window.setInterval(() => {
      void refresh();
    }, pollMs);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [pollMs]);

  return tree;
}
