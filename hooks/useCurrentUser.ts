"use client";

import { useCallback } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import type { CurrentUser, MeResponse } from "@/lib/board";

export function useCurrentUser() {
  const loadCurrentUser = useCallback(async () => {
    const response = await fetch("/api/me", { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as MeResponse;
    return payload.ok ? (payload.user ?? null) : null;
  }, []);

  const { data: user } = useAsyncResource<CurrentUser | null>(loadCurrentUser, null);

  return user;
}
