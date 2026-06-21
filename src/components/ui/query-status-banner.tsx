"use client";

import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QueryStatusBanner({
  isError,
  isFetching,
  onRetry,
}: {
  isError: boolean;
  isFetching: boolean;
  onRetry: () => void;
}) {
  if (isError) {
    return (
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[rgba(255,69,58,0.2)] bg-[var(--danger-soft)] p-4 text-sm font-semibold text-[var(--danger)]">
        <span>Could not refresh the latest trip data.</span>
        <Button type="button" variant="secondary" className="min-h-9 px-3 py-1 text-xs" onClick={onRetry}>
          <RefreshCcw size={14} />
          Retry
        </Button>
      </div>
    );
  }

  if (isFetching) {
    return (
      <div className="rounded-[18px] border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm font-semibold text-[var(--muted-foreground)]">
        Updating trip data...
      </div>
    );
  }

  return null;
}
