import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = readFileSync("playwright.config.ts", "utf8");

describe("Playwright configuration", () => {
  it("starts the Next dev server for self-contained E2E runs", () => {
    expect(config).toContain("webServer");
    expect(config).toContain("corepack pnpm exec next dev");
    expect(config).toContain("reuseExistingServer");
  });
});
