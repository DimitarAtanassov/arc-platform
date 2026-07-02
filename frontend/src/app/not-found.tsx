import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="404"
        title="Page not found"
        description="That route does not exist in the console."
      />
      <EmptyState
        icon={FileQuestion}
        title="Nothing here"
        description="The page you requested could not be found or has not been built yet."
        action={
          <Button asChild variant="primary" size="sm">
            <Link href="/">Back to overview</Link>
          </Button>
        }
      />
    </div>
  );
}
