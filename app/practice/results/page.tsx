import Link from "next/link";
import { AccuracyBar } from "@/components/AccuracyBar";
import { PracticeResultActions } from "@/components/PracticeResultActions";

type PracticeResultsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseNumberParam(value: string | string[] | undefined): number {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseIds(value: string | string[] | undefined): string[] {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (!normalized) {
    return [];
  }

  return normalized
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export default async function PracticeResultsPage({ searchParams }: PracticeResultsPageProps) {
  const params = await searchParams;
  const allIds = parseIds(params.ids);
  const total = parseNumberParam(params.total);
  const correct = parseNumberParam(params.correct);
  const partial = parseNumberParam(params.partial);
  const retryIds = parseIds(params.retry ?? params.wrong);
  const incorrect = Math.max(total - correct - partial, 0);
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const retrySessionHref =
    retryIds.length > 0
      ? `/practice/session?ids=${encodeURIComponent(retryIds.join(","))}`
      : "";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">演習結果</h1>

      <div className="rounded-md border bg-white p-5">
        <p className="text-sm text-zinc-500">正答率</p>
        <p className="mt-1 text-3xl font-bold text-zinc-900">{accuracy}%</p>
        <div className="mt-3">
          <AccuracyBar correct={correct} partial={partial} total={total} />
        </div>
        <p className="mt-2 text-sm text-zinc-700">○ {correct} / △ {partial} / ✕ {incorrect}</p>
      </div>

      <div className="rounded-md border bg-zinc-50 p-4">
        <p className="text-sm font-medium text-zinc-800">結果サマリー</p>
        <p className="mt-2 text-sm text-zinc-700">再演習対象(✕+△): {Math.max(total - correct, 0)} 問</p>
        <p className="mt-1 text-sm text-zinc-700">全問○まであと: {Math.max(total - correct, 0)} 問</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/practice"
          className="inline-flex h-10 items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black/85"
        >
          問題選択へ戻る
        </Link>
        {retrySessionHref ? (
          <Link
            href={retrySessionHref}
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
          >
            ✕と△を再演習
          </Link>
        ) : null}
      </div>

      <PracticeResultActions total={total} correct={correct} partial={partial} problemIds={allIds} />
    </div>
  );
}
