import { Skeleton } from "@/components/ui/skeleton";

type TreeSkeletonProps = {
  lines?: number;
};

export function TreeSkeleton({ lines = 4 }: TreeSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={`h-4 ${index === 0 ? "w-4/5" : index === lines - 1 ? "w-1/2" : "w-2/3"}`}
        />
      ))}
    </div>
  );
}

type ResultListSkeletonProps = {
  cards?: number;
};

export function ResultListSkeleton({ cards = 2 }: ResultListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="rounded-md border p-3">
          <Skeleton className={`h-4 ${index % 2 === 0 ? "w-1/3" : "w-2/5"}`} />
          <Skeleton className={`mt-2 h-3 ${index % 2 === 0 ? "w-1/2" : "w-1/3"}`} />
          <div className="mt-3 flex gap-2">
            <Skeleton className={`h-5 ${index % 2 === 0 ? "w-16" : "w-20"}`} />
            <Skeleton className={`h-5 ${index % 2 === 0 ? "w-20" : "w-24"}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
