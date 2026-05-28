import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-5"><Skeleton className="h-5 w-24" /><Skeleton className="mt-4 h-10 w-32" /></Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>
        <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>
      </div>
      <Card className="p-5"><Skeleton className="h-80 w-full" /></Card>
    </div>
  );
}
