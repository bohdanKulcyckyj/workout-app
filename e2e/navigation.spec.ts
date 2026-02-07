import { test, expect } from "@playwright/test";
import { clearStorage, createExercise, createPlan } from "./helpers";

test.beforeEach(async ({ page }) => {
  await clearStorage(page);
});

test.describe("Navigation", () => {
  test("nav header shows Plans and Exercises links", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Plans" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Exercises" })).toBeVisible();
  });

  test("can navigate from plans to exercises", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Exercises" }).click();
    await expect(page).toHaveURL("/exercise");
    await expect(
      page.getByRole("heading", { name: "Exercises", exact: true })
    ).toBeVisible();
  });

  test("can navigate from exercises to plans", async ({ page }) => {
    await page.goto("/exercise");

    await page.getByRole("link", { name: "Plans" }).click();
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { name: "Workout Plans", exact: true })
    ).toBeVisible();
  });

  test("can navigate from plan detail to exercises", async ({ page }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });
    await createPlan(page, "Push Day", ["Bench Press"]);

    // On plan detail page
    await expect(page).toHaveURL(/\/plan\/.+/);
    await page.getByRole("link", { name: "Exercises" }).click();
    await expect(page).toHaveURL("/exercise");
  });

  test("can navigate from exercise detail to plans", async ({ page }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });

    await page.getByRole("link", { name: "Bench Press" }).click();
    await expect(page).toHaveURL(/\/exercise\/.+/);

    await page.getByRole("link", { name: "Plans" }).click();
    await expect(page).toHaveURL("/");
  });

  test("exercise list Edit dropdown navigates to edit page", async ({
    page,
  }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });

    await page.goto("/exercise");
    await page.getByRole("button", { name: /open menu/i }).click();
    await page.getByRole("menuitem", { name: /edit/i }).click();

    await expect(page).toHaveURL(/\/exercise\/.+\/edit/);
    await expect(
      page.getByRole("heading", { name: "Edit Exercise" })
    ).toBeVisible();
  });

  test("exercise create New button works from list page", async ({ page }) => {
    await page.goto("/exercise");

    await page.getByRole("link", { name: "New" }).click();
    await expect(page).toHaveURL("/exercise/create");
    await expect(
      page.getByRole("heading", { name: "Create Exercise" })
    ).toBeVisible();
  });
});
