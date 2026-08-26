import { test, expect, type Page } from "@playwright/test";
import {
  resetAndLogin,
  login,
  signOut,
  createExercise,
  createPlan,
  OTHER_USER,
} from "./helpers";

/**
 * Collect anything the page throws. The provider gate's failure mode is a
 * thrown React error ("useRepositories must be used within a RepositoryProvider")
 * behind the Next dev overlay -- the navigation still lands on /login, so a
 * URL-only assertion passes while the bug is live. Watch the errors instead.
 */
function watchForErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

test.beforeEach(async ({ page }) => {
  await resetAndLogin(page);
});

test.describe("Auth Transitions", () => {
  test("signing out from a plan detail page lands on /login cleanly", async ({
    page,
  }) => {
    await createExercise(page, "Squat", { weight: "80", reps: "5" });
    await createPlan(page, "Leg Day", ["Squat"]);

    // Only from here on: the setup above is not what is under test.
    const errors = watchForErrors(page);

    await signOut(page);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    expect(
      errors,
      `Signing out of the plan detail page raised errors. The data page most ` +
        `likely rendered without a user and called useRepositories() against a ` +
        `missing provider -- see the gate in lib/repositories/provider.tsx.`
    ).toEqual([]);
  });

  test("signing out from an exercise detail page lands on /login cleanly", async ({
    page,
  }) => {
    await createExercise(page, "Bench Press", { weight: "60", reps: "8" });
    await page.goto("/exercise");
    await page.getByRole("link", { name: "Bench Press" }).click();
    await expect(page).toHaveURL(/\/exercise\/.+/);

    const errors = watchForErrors(page);

    await signOut(page);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    expect(
      errors,
      `Signing out of the exercise detail page raised errors -- see the gate ` +
        `in lib/repositories/provider.tsx.`
    ).toEqual([]);
  });

  test("a second user sees none of the first user's data", async ({ page }) => {
    await createExercise(page, "Deadlift", { weight: "100", reps: "5" });
    const planUrl = await createPlan(page, "Pull Day", ["Deadlift"]);

    await signOut(page);
    await login(page, OTHER_USER.email, OTHER_USER.password);

    // RLS filters the rows out, so this is the empty state -- not an error.
    await expect(page.getByText("No workout plans yet")).toBeVisible();
    await page.goto("/exercise");
    await expect(page.getByText("No exercises yet")).toBeVisible();

    // Same distinction on a direct hit: an unreadable row is a missing row.
    await page.goto(planUrl);
    await expect(
      page.getByRole("heading", { name: "Plan Not Found" })
    ).toBeVisible();
  });
});
