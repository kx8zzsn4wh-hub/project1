type AccuracyBarProps = {
  correct: number;
  partial?: number;
  total: number;
  size?: "sm" | "md";
};

export function AccuracyBar({ correct, partial = 0, total, size = "md" }: AccuracyBarProps) {
  const safeTotal = Math.max(total, 0);
  const safeCorrect = Math.min(Math.max(correct, 0), safeTotal);
  const remainingAfterCorrect = Math.max(safeTotal - safeCorrect, 0);
  const safePartial = Math.min(Math.max(partial, 0), remainingAfterCorrect);
  const safeIncorrect = Math.max(safeTotal - safeCorrect - safePartial, 0);

  const correctPercent = safeTotal > 0 ? (safeCorrect / safeTotal) * 100 : 0;
  const partialPercent = safeTotal > 0 ? (safePartial / safeTotal) * 100 : 0;
  const incorrectPercent = safeTotal > 0 ? (safeIncorrect / safeTotal) * 100 : 0;
  const percent = safeTotal > 0 ? Math.round((safeCorrect / safeTotal) * 100) : 0;
  const trackHeight = size === "sm" ? "h-2" : "h-3";

  return (
    <div className="space-y-1.5">
      <div className={`flex w-full overflow-hidden rounded-full bg-zinc-200 ${trackHeight}`}>
        <div
          className="h-full bg-emerald-500 transition-[width] duration-300"
          style={{ width: `${correctPercent}%` }}
          aria-label={`正解 ${safeCorrect}問`}
        />
        <div
          className="h-full bg-amber-500 transition-[width] duration-300"
          style={{ width: `${partialPercent}%` }}
          aria-label={`部分正解 ${safePartial}問`}
        />
        <div
          className="h-full bg-rose-500 transition-[width] duration-300"
          style={{ width: `${incorrectPercent}%` }}
          aria-label={`不正解 ${safeIncorrect}問`}
        />
      </div>
      <p className="text-xs text-zinc-600">○{safeCorrect} △{safePartial} ✕{safeIncorrect} / {safeTotal} (○ {percent}%)</p>
    </div>
  );
}
