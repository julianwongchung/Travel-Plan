import { expect, test } from "@playwright/test";

test.describe("Travel OS V1", () => {
  test("sends unauthenticated users from trips to login", async ({ page }) => {
    await page.goto("/trips");
    await expect(page).toHaveURL(/\/login/);
  });

  test("keeps workspace routes behind login", async ({ page }) => {
    for (const route of [
      "/trips/trip-1/overview",
      "/trips/trip-1/trip-plan",
      "/trips/trip-1/places",
      "/trips/trip-1/expenses",
    ]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("shows login-only auth screen", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: "GoGoPlan home" })).toBeVisible();
    await expect(page.getByRole("img", { name: "GoGoPlan" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign up/i })).toHaveCount(0);
  });
});
