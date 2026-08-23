import { test, expect, Page } from "@playwright/test";
import { resetAndLogin } from "./helpers";

// Current-format localStorage: standalone exercises + plans referencing them.
const CURRENT = {
  exercises: [
    { id: "11111111-1111-4111-8111-111111111111", label: "Bench Press", weight: 60, reps: 8 },
    { id: "22222222-2222-4222-8222-222222222222", label: "Squat", weight: 100, reps: 5 },
    { id: "33333333-3333-4333-8333-333333333333", label: "Deadlift", weight: 120, reps: 3 },
  ],
  plans: [
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Full Body",
      // Deliberately not alphabetical -- the import must preserve this order.
      exerciseIds: [
        "33333333-3333-4333-8333-333333333333",
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

// Pre-refactor format: exercises inlined on the plan, no standalone key,
// and no `migration-v1-done` marker.
const LEGACY = [
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    name: "Legacy Day",
    exercises: [
      { id: "44444444-4444-4444-8444-444444444444", name: "Pull Up", weight: 0, reps: 10, done: false },
      { id: "55555555-5555-4555-8555-555555555555", name: "Dip", weight: 0, reps: 12, done: false },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

/**
 * Replace localStorage wholesale, then reload so the prompt's effect sees it.
 *
 * clear() first, deliberately: the app sets `migration-v1-done` on its very
 * first load, and migrateLocalStorage() returns early on that marker. Leaving
 * it set would make the legacy fixture look already-migrated and never get
 * normalised -- which is not what a real legacy browser looks like.
 */
async function seedLocalStorage(
  page: Page,
  entries: Record<string, unknown>
) {
  await page.evaluate((data) => {
    localStorage.clear();
    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, entries);
  await page.reload();
}

async function runImport(page: Page) {
  await expect(page.getByRole("button", { name: "Import" })).toBeVisible();
  await page.getByRole("button", { name: "Import" }).click();
}

test.beforeEach(async ({ page }) => {
  await resetAndLogin(page);
});

test.describe("Import local data", () => {
  test("imports current-format localStorage intact, preserving order", async ({
    page,
  }) => {
    await seedLocalStorage(page, {
      "workout-plans": CURRENT.plans,
      exercises: CURRENT.exercises,
      "migration-v1-done": true,
    });

    await runImport(page);
    await expect(page.getByText("Imported 3 exercises and 1 plan.")).toBeVisible();

    // Plan came across.
    await expect(page.getByText("Full Body")).toBeVisible();

    // Exercises came across, with their values.
    await page.goto("/exercise");
    for (const label of ["Bench Press", "Squat", "Deadlift"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    // Association *and* order survived: Deadlift, Bench Press, Squat.
    await page.goto("/");
    await page.getByRole("link", { name: "Full Body" }).click();
    await expect(page.getByRole("heading", { name: "Full Body" })).toBeVisible();
    const rows = page.getByRole("row").filter({ hasNotText: "Exercise" });
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("Deadlift");
    await expect(rows.nth(1)).toContainText("Bench Press");
    await expect(rows.nth(2)).toContainText("Squat");
  });

  test("imports legacy inline-exercise localStorage", async ({ page }) => {
    // No `exercises` key and no migration marker -- migrateLocalStorage() has
    // to normalise this before the import can read anything useful.
    await seedLocalStorage(page, { "workout-plans": LEGACY });

    await runImport(page);
    await expect(page.getByText("Imported 2 exercises and 1 plan.")).toBeVisible();

    await expect(page.getByText("Legacy Day")).toBeVisible();
    await page.goto("/exercise");
    await expect(page.getByText("Pull Up", { exact: true })).toBeVisible();
    await expect(page.getByText("Dip", { exact: true })).toBeVisible();
  });

  test("re-importing produces no duplicates and no changed counts", async ({
    page,
  }) => {
    await seedLocalStorage(page, {
      "workout-plans": CURRENT.plans,
      exercises: CURRENT.exercises,
      "migration-v1-done": true,
    });
    await runImport(page);
    await expect(page.getByText("Imported 3 exercises and 1 plan.")).toBeVisible();

    // Clear the marker and run it again -- correctness must come from the
    // upserts, not from the marker.
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("import-completed-")) localStorage.removeItem(key);
      }
    });
    await page.reload();
    await runImport(page);
    await expect(page.getByText("Imported 3 exercises and 1 plan.")).toBeVisible();

    // Counts unchanged: still 1 plan, 3 exercises, 3 links in the right order.
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Full Body" })).toHaveCount(1);

    await page.goto("/exercise");
    for (const label of ["Bench Press", "Squat", "Deadlift"]) {
      await expect(page.getByText(label, { exact: true })).toHaveCount(1);
    }

    await page.goto("/");
    await page.getByRole("link", { name: "Full Body" }).click();
    const rows = page.getByRole("row").filter({ hasNotText: "Exercise" });
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("Deadlift");
  });

  test("no prompt when localStorage is empty", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Import" })).not.toBeVisible();
  });

  test("prompt does not reappear after a successful import", async ({
    page,
  }) => {
    await seedLocalStorage(page, {
      "workout-plans": CURRENT.plans,
      exercises: CURRENT.exercises,
      "migration-v1-done": true,
    });
    await runImport(page);
    await expect(page.getByText("Imported 3 exercises and 1 plan.")).toBeVisible();

    // Gone on reload and on a fresh route -- the marker suppresses it.
    await page.reload();
    await expect(page.getByRole("button", { name: "Import" })).not.toBeVisible();
    await page.goto("/exercise");
    await expect(page.getByRole("button", { name: "Import" })).not.toBeVisible();
  });

  test("import does not clear localStorage", async ({ page }) => {
    await seedLocalStorage(page, {
      "workout-plans": CURRENT.plans,
      exercises: CURRENT.exercises,
      "migration-v1-done": true,
    });
    await runImport(page);
    await expect(page.getByText("Imported 3 exercises and 1 plan.")).toBeVisible();

    // localStorage is the only copy of this data -- it stays as the fallback.
    const kept = await page.evaluate(() => ({
      plans: JSON.parse(localStorage.getItem("workout-plans") ?? "[]").length,
      exercises: JSON.parse(localStorage.getItem("exercises") ?? "[]").length,
    }));
    expect(kept).toEqual({ plans: 1, exercises: 3 });
  });

  test("a failed import reports the failure and leaves localStorage intact", async ({
    page,
  }) => {
    await seedLocalStorage(page, {
      "workout-plans": CURRENT.plans,
      exercises: CURRENT.exercises,
      "migration-v1-done": true,
    });

    // Break the write path only, so the failure is a real one from the repo.
    await page.route("**/rest/v1/exercises**", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ message: "simulated failure" }),
          })
        : route.continue()
    );

    await runImport(page);
    await expect(page.getByText(/Import failed/)).toBeVisible();

    const kept = await page.evaluate(() => ({
      plans: JSON.parse(localStorage.getItem("workout-plans") ?? "[]").length,
      exercises: JSON.parse(localStorage.getItem("exercises") ?? "[]").length,
    }));
    expect(kept).toEqual({ plans: 1, exercises: 3 });
  });

  test("a second user importing does not touch the first user's data", async ({
    page,
  }) => {
    await seedLocalStorage(page, {
      "workout-plans": CURRENT.plans,
      exercises: CURRENT.exercises,
      "migration-v1-done": true,
    });
    await runImport(page);
    await expect(page.getByText("Imported 3 exercises and 1 plan.")).toBeVisible();

    // Sign out and in as the other seeded user, keeping the same localStorage.
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel("Email").fill("other@example.com");
    await page.getByLabel("Password").fill("other-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("link", { name: "Plans" })).toBeVisible();

    // The marker is per-user, so the prompt is offered again. This is the case
    // that forced ids to be derived per user: `id` is the sole primary key, so
    // importing the first user's ids verbatim would collide, and RLS rejects
    // that with 42501 -- the second user's import would fail outright.
    await runImport(page);
    await expect(page.getByText("Imported 3 exercises and 1 plan.")).toBeVisible();

    // The second user gets their own copy...
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Full Body" })).toHaveCount(1);

    // ...and the first user's is untouched: still exactly one plan, with its
    // three exercises in the original order.
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("test-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("link", { name: "Full Body" })).toHaveCount(1);

    await page.getByRole("link", { name: "Full Body" }).click();
    const rows = page.getByRole("row").filter({ hasNotText: "Exercise" });
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("Deadlift");
  });
});
