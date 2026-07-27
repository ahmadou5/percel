import { Skeleton } from './skeleton';

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export function TableSkeleton({ columns = 5, rows = 5 }: TableSkeletonProps) {
  return (
    <div className="w-full space-y-3 p-4">
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        {Array.from({ length: columns }).map((_, c) => (
          <Skeleton key={c} className="h-4 w-24" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center justify-between py-2 border-b border-border/30">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-5 w-20" />
          ))}
        </div>
      ))}
    </div>
  );
}
