import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The requested route does not exist in this application.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Back to overview</Link>
      </Button>
    </div>
  );
}
