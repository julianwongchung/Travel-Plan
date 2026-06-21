// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryStatusBanner } from "@/components/ui/query-status-banner";

const clientQueries = readFileSync("src/lib/db/client-queries.ts", "utf8");
const serverQueries = readFileSync("src/lib/db/queries.ts", "utf8");

describe("query error handling", () => {
  afterEach(cleanup);

  it("throws Supabase query errors instead of coercing them to empty arrays", () => {
    expect(clientQueries).toContain("assertNoQueryError(daysError");
    expect(clientQueries).toContain("assertNoQueryError(expensesError");
    expect(clientQueries).toContain("assertNoQueryError(placesError");
    expect(serverQueries).toContain("assertNoQueryError(daysError");
    expect(serverQueries).toContain("assertNoQueryError(membersError");
  });

  it("shows a retry action when React Query refresh fails", () => {
    const onRetry = vi.fn();

    render(<QueryStatusBanner isError isFetching={false} onRetry={onRetry} />);

    expect(screen.getByText("Could not refresh the latest trip data.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
