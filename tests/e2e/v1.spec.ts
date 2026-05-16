import { expect, test } from "@playwright/test";

test.describe("Travel OS V1", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/trips");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows login-only auth screen", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Travel OS" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign up/i })).toHaveCount(0);
  });
});
