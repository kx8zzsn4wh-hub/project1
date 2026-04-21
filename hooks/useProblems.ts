"use client";

import { useCallback } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import type { Problem } from "@/lib/problem-types";

type ProblemsApiResponse = {
  ok: boolean;
  problems?: Problem[];
  message?: string;
};

type ProblemKind = Problem["kind"];

export function useProblems(kind?: ProblemKind) {
  const loadProblems = useCallback(async () => {
    const endpoint = kind ? `/api/problems?kind=${kind}` : "/api/problems";
    const response = await fetch(endpoint, { cache: "no-store" });
    const payload = (await response.json()) as ProblemsApiResponse;

    if (!response.ok || !payload.ok) {
      throw new Error(payload.message ?? "Failed to load problems");
    }

    return payload.problems ?? [];
  }, [kind]);

  const {
    data: problems,
    loading,
    error,
  } = useAsyncResource<Problem[]>(loadProblems, []);

  return { problems, loading, error };
}
