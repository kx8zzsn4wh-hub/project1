"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function AccessForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const payload = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

      if (!res.ok || !payload?.ok) {
        setError(payload?.message ?? "アクセスコードが正しくありません。");
        return;
      }

      const rawFrom = searchParams.get("from") ?? "/";
      const from = rawFrom.startsWith("/") && !rawFrom.startsWith("//") ? rawFrom : "/";
      router.replace(from);
    } catch {
      setError("エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <p className="text-sm text-zinc-600">このサービスを利用するにはアクセスコードが必要です。</p>
        <Input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="アクセスコード"
          autoFocus
          required
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "確認中..." : "進む"}
      </Button>
    </form>
  );
}

export default function AccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">アクセスコードを入力</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense>
            <AccessForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
