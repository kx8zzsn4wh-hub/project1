"use client";

import { useEffect, useState } from "react";

export function useAsyncResource<T>(
  loader: () => Promise<T>,
  initialData: T,
) {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const nextData = await loader();
        if (!active) {
          return;
        }

        setData(nextData);
      } catch (caught) {
        if (!active) {
          return;
        }

        const message = caught instanceof Error ? caught.message : "Failed to load resource";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [loader]);

  return {
    data,
    setData,
    loading,
    error,
    setError,
  };
}