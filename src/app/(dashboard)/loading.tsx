import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <>
      <Header title="Loading" description="Fetching dashboard data..." />
      <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>
      <div className="px-6 pb-6">
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </>
  );
}
