import { Page, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "test-password-123";

/** The second seeded user, for RLS isolation checks. */
export const OTHER_USER = {
  email: "other@example.com",
  password: "other-password-123",
} as const;

// PostgREST requires a filter on delete; nothing has the nil uuid, so this
// matches every row.
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

// service_role bypasses RLS, which is the point: it truncates the test user's
// rows between tests. Node only -- never imported by the app.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. " +
      "Run `supabase start`, then copy .env.example to .env.local and fill " +
      "them in from `supabase status` (see README)."
  );
}
const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});

/** Sign in through the UI as any seeded user. */
export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // The nav only renders once a session exists, so this is the signed-in signal.
  await expect(page.getByRole("link", { name: "Plans" })).toBeVisible();
}

/** Sign out through the nav, ending on /login. */
export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
}

/** Wipe the test user's data, then sign in through the UI. */
export async function resetAndLogin(page: Page) {
  // plan_exercises goes with them via the FK cascade. The filter matches every
  // row, so this also clears anything the other seeded user left behind.
  for (const table of ["plans", "exercises"]) {
    const { error } = await admin.from(table).delete().neq("id", ZERO_UUID);
    if (error) throw new Error(`reset ${table}: ${error.message}`);
  }

  await login(page, TEST_EMAIL, TEST_PASSWORD);
}

/** Create an exercise through the UI. */
export async function createExercise(
  page: Page,
  name: string,
  options?: { weight?: string; reps?: string; description?: string }
) {
  await page.goto("/exercise/create");
  await page.getByLabel("Name *").fill(name);

  if (options?.description) {
    await page.getByLabel("Description").fill(options.description);
  }
  if (options?.weight) {
    await page.getByLabel("Default Weight").fill(options.weight);
  }
  if (options?.reps) {
    await page.getByLabel("Default Reps").fill(options.reps);
  }

  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL("/exercise");
  // The write is a round-trip now -- wait for the row, not just the redirect.
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
}

/** Create a plan by selecting existing exercises from dropdown. */
export async function createPlan(
  page: Page,
  name: string,
  exerciseNames: string[]
) {
  await page.goto("/plan/create");
  await page.getByLabel("Plan Name").fill(name);

  for (const exerciseName of exerciseNames) {
    await page.getByRole("combobox", { name: /add exercise/i }).click();
    await page.getByRole("option", { name: new RegExp(exerciseName, "i") }).click();
  }

  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).not.toHaveURL("/plan/create");
  await expect(page).toHaveURL(/\/plan\/.+/);
  // Detail page has finished its fetch when the plan name is on screen.
  await expect(page.getByRole("heading", { name })).toBeVisible();
  return page.url();
}
